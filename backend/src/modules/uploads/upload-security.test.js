import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { Readable } from "node:stream";
import { mock, test } from "node:test";
import express from "express";
import { v2 as cloudinary } from "cloudinary";
import {
  UPLOAD_RATE_LIMIT_CONFIG,
  uploadIpLimiter,
  uploadUserLimiter,
} from "./upload-rate-limit.js";
import { FILE_UPLOAD } from "../../config/constants.js";

process.env.CLOUDINARY_CLOUD_NAME ||= "test-cloud";
process.env.CLOUDINARY_API_KEY ||= "test-key";
process.env.CLOUDINARY_API_SECRET ||= "test-secret";

const { isSupportedImage, storeUploadedFile, uploadSingle } = await import(
  "./upload.service.js"
);
const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const request = (server, path) =>
  new Promise((resolve, reject) => {
    const address = server.address();
    const req = import("node:http").then(({ get }) =>
      get(
        {
          hostname: "127.0.0.1",
          port: address.port,
          path,
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res));
        }
      )
    );
    req.catch(reject);
  });

test("upload limits use the configured defaults", () => {
  assert.deepEqual(UPLOAD_RATE_LIMIT_CONFIG, {
    perUser: { windowMs: 60 * 60 * 1000, max: 20 },
    perIp: { windowMs: 10 * 60 * 1000, max: 5 },
  });
});

test("the IP limiter rejects excessive requests but unrelated routes remain available", async () => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { _id: { toString: () => "user-1" } };
    next();
  });
  app.get("/upload", uploadIpLimiter, uploadUserLimiter, (_req, res) =>
    res.sendStatus(204)
  );
  app.get("/unrelated", (_req, res) => res.sendStatus(204));

  const server = createServer(app).listen(0);
  await once(server, "listening");
  try {
    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      responses.push(await request(server, "/upload"));
    }
    assert.deepEqual(
      responses.map((response) => response.statusCode),
      [204, 204, 204, 204, 204, 429]
    );
    assert.equal(
      (await request(server, "/unrelated")).statusCode,
      204
    );
  } finally {
    server.close();
  }
});

test("the per-user limiter rejects excessive requests independently of IP identity", async () => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { _id: { toString: () => "user-2" } };
    next();
  });
  app.get("/upload", uploadUserLimiter, (_req, res) => res.sendStatus(204));

  const server = createServer(app).listen(0);
  await once(server, "listening");
  try {
    const responses = [];
    for (let index = 0; index < 21; index += 1) {
      responses.push(await request(server, `/upload?request=${index}`));
    }
    assert.equal(responses.filter((response) => response.statusCode === 204).length, 20);
    assert.equal(responses.at(-1).statusCode, 429);
  } finally {
    server.close();
  }
});

test("file signature validation rejects MIME spoofing", () => {
  assert.equal(isSupportedImage({ mime: "image/png", ext: "png" }), true);
  assert.equal(isSupportedImage({ mime: "image/png", ext: "exe" }), false);
  assert.equal(isSupportedImage({ mime: "application/zip", ext: "zip" }), false);
});

test("invalid file content is rejected before Cloudinary upload", async () => {
  const uploadStream = mock.method(cloudinary.uploader, "upload_stream");
  try {
    await assert.rejects(
      storeUploadedFile({
        buffer: Buffer.from("not an image"),
        mimetype: "image/png",
        originalname: "spoofed.png",
        size: 12,
      }),
      { statusCode: 400 }
    );
    assert.equal(uploadStream.mock.callCount(), 0);
  } finally {
    uploadStream.mock.restore();
  }
});

test("oversized files are rejected before Cloudinary upload", async () => {
  const uploadStream = mock.method(cloudinary.uploader, "upload_stream");
  const boundary = "upload-test-boundary";
  const oversizedFile = Buffer.alloc(FILE_UPLOAD.MAX_SIZE + 1, 0);
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="large.png"\r\nContent-Type: image/png\r\n\r\n`
    ),
    oversizedFile,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const req = Readable.from(body);
  req.headers = {
    "content-type": `multipart/form-data; boundary=${boundary}`,
    "content-length": body.length.toString(),
  };
  req.method = "POST";
  req.url = "/upload";

  try {
    const error = await new Promise((resolve) =>
      uploadSingle(req, {}, (middlewareError) => resolve(middlewareError))
    );
    assert.equal(error.code, "LIMIT_FILE_SIZE");
    assert.equal(uploadStream.mock.callCount(), 0);
  } finally {
    uploadStream.mock.restore();
  }
});

test("Cloudinary failures return a safe error", async () => {
  const uploadStream = mock.method(
    cloudinary.uploader,
    "upload_stream",
    (_options, callback) => {
      const stream = {
        destroy() {},
        end() {
          callback(new Error("provider secret details"), null);
        },
      };
      return stream;
    }
  );

  try {
    await assert.rejects(
      storeUploadedFile({
        buffer: validPng,
        mimetype: "image/png",
        originalname: "item.png",
        size: validPng.length,
      }),
      (error) =>
        error.statusCode === 502 &&
        error.message === "Image upload provider unavailable"
    );
    assert.equal(uploadStream.mock.callCount(), 1);
  } finally {
    uploadStream.mock.restore();
  }
});
