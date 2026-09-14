import assert from "node:assert/strict";
import test, { before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret";
process.env.JWT_EXPIRE = "15m";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAME_SITE = "lax";
process.env.CLOUDINARY_CLOUD_NAME = "integration-test";
process.env.CLOUDINARY_API_KEY = "integration-test";
process.env.CLOUDINARY_API_SECRET = "integration-test";

let app;
let User;
let LostItem;
let FoundItem;
let Notification;
let PendingUpload;
let claimPendingUpload;
let matchingService;
let runTransferOldItems;
let emailService;
let createPasswordResetToken;
let mongo;

const PASSWORD = "ValidPass1";
const today = () => new Date().toISOString().slice(0, 10);

const createUser = async (overrides = {}) =>
  User.create({
    name: "Integration User",
    email: `user-${new mongoose.Types.ObjectId()}@s.amity.edu`,
    password: PASSWORD,
    role: "student",
    isEmailVerified: true,
    profileCompleted: true,
    block: "A",
    ...overrides,
  });

const login = async (agent, email, password = PASSWORD) => {
  const response = await agent
    .post("/api/auth/login")
    .send({ email, password });
  assert.equal(response.status, 200);
  return response.body.data;
};

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(mongo.getUri(), { dbName: "lost-found-integration" });

  ({ default: app } = await import("../app/app.js"));
  ({ User } = await import("../modules/auth/User.model.js"));
  ({ LostItem } = await import("../modules/lost-items/LostItem.model.js"));
  ({ FoundItem } = await import("../modules/found-items/FoundItem.model.js"));
  ({ Notification } = await import(
    "../modules/notifications/Notification.model.js"
  ));
  ({ PendingUpload } = await import(
    "../modules/uploads/PendingUpload.model.js"
  ));
  ({ claimPendingUpload } = await import(
    "../modules/uploads/pending-upload.service.js"
  ));
  ({ default: matchingService } = await import(
    "../modules/matching/matching.service.js"
  ));
  ({ runTransferOldItems } = await import("../jobs/transferOldItems.job.js"));
  ({ emailService } = await import("../shared/services/email.service.js"));
  ({ createPasswordResetToken } = await import(
    "../modules/auth/password-reset.service.js"
  ));
  emailService.sendMatchNotification = async () => true;
  emailService.sendPasswordResetConfirmation = async () => true;
  await Promise.all(
    [User, LostItem, FoundItem, Notification, PendingUpload].map((model) =>
      model.init()
    )
  );
});

beforeEach(async () => {
  await Promise.all(
    [User, LostItem, FoundItem, Notification, PendingUpload].map((model) =>
      model.deleteMany({})
    )
  );
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("rejects invalid registration and supports login success/failure", async () => {
  const invalid = await request(app)
    .post("/api/auth/register")
    .send({ name: "A", email: "not-an-email", password: "weak" });
  assert.equal(invalid.status, 400);

  const user = await createUser({ email: "login-user@s.amity.edu" });
  const agent = request.agent(app);
  const loggedIn = await login(agent, user.email);
  assert.ok(loggedIn.token);
  assert.equal(loggedIn.user.email, user.email);

  const failed = await request(app)
    .post("/api/auth/login")
    .send({ email: user.email, password: "WrongPass1" });
  assert.equal(failed.status, 401);
});

test("protects routes and rejects invalid access tokens", async () => {
  const user = await createUser();
  const agent = request.agent(app);
  const session = await login(agent, user.email);

  const me = await request(app).get("/api/auth/me").set(bearer(session.token));
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, user.email);

  const invalid = await request(app)
    .get("/api/auth/me")
    .set(bearer("not-a-valid-jwt"));
  assert.equal(invalid.status, 401);
});

test("rotates refresh tokens and revokes the session on logout", async () => {
  const user = await createUser({ email: "refresh-user@s.amity.edu" });
  const agent = request.agent(app);
  const loginResponse = await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: PASSWORD });
  assert.equal(loginResponse.status, 200);
  const initial = loginResponse.body.data;
  const initialCookie = loginResponse.headers["set-cookie"]?.[0]?.split(";")[0];
  assert.match(initialCookie, /^refreshToken=/);

  const refreshed = await agent.post("/api/auth/refresh");
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.data.token);
  assert.notEqual(refreshed.body.data.token, initial.token);

  const replay = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", initialCookie);
  assert.equal(replay.status, 401);

  const loggedOut = await agent.post("/api/auth/logout");
  assert.equal(loggedOut.status, 200);
  const afterLogout = await agent.post("/api/auth/refresh");
  assert.equal(afterLogout.status, 401);
});

test("revokes existing refresh sessions after a successful password reset", async () => {
  const user = await createUser({ email: "reset-user@s.amity.edu" });
  const agent = request.agent(app);
  await login(agent, user.email);
  const resetToken = createPasswordResetToken({
    userId: user._id.toString(),
    resetVersion: 0,
    secret: process.env.JWT_SECRET,
  });

  const reset = await request(app).post("/api/auth/reset-password").send({
    resetToken,
    newPassword: "NewValidPass1",
    confirmPassword: "NewValidPass1",
  });
  assert.equal(reset.status, 200);
  assert.equal((await agent.post("/api/auth/refresh")).status, 401);
});

test("prevents cross-user resource access and rejects normal users from admin routes", async () => {
  const owner = await createUser({ email: "owner@s.amity.edu" });
  const other = await createUser({ email: "other@s.amity.edu" });
  const lostItem = await LostItem.create({
    userId: owner._id,
    name: "Wallet",
    color: "Black",
    condition: "Used",
    dateLost: today(),
    placeLost: "Block A - Library",
  });
  const otherSession = await login(request.agent(app), other.email);

  const resource = await request(app)
    .get(`/api/lostitems/${lostItem._id}`)
    .set(bearer(otherSession.token));
  assert.equal(resource.status, 403);

  const adminRoute = await request(app)
    .get("/api/management/analytics")
    .set(bearer(otherSession.token));
  assert.equal(adminRoute.status, 403);
});

test("claims pending uploads only for the owner and only once under concurrency", async () => {
  const owner = await createUser();
  const other = await createUser();
  await PendingUpload.create({
    publicId: "integration-image",
    url: "https://example.test/image.jpg",
    userId: owner._id,
  });

  assert.equal(
    await claimPendingUpload(PendingUpload, {
      publicId: "integration-image",
      userId: other._id,
    }),
    null
  );

  const results = await Promise.all([
    claimPendingUpload(PendingUpload, {
      publicId: "integration-image",
      userId: owner._id,
    }),
    claimPendingUpload(PendingUpload, {
      publicId: "integration-image",
      userId: owner._id,
    }),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(
    (
      await PendingUpload.findOne({ publicId: "integration-image" })
    ).claimedBy.toString(),
    owner._id.toString()
  );
});

test("creates a matching relationship and one notification without duplicate relationships", async () => {
  const student = await createUser({ email: "matcher@s.amity.edu" });
  const admin = await createUser({
    email: "admin@gwa.amity.edu",
    role: "admin",
    block: "A",
  });
  const lost = await LostItem.create({
    userId: student._id,
    name: "Laptop",
    color: "Black",
    condition: "Used",
    dateLost: today(),
    placeLost: "Block A - Library",
  });
  const found = await FoundItem.create({
    createdBy: admin._id,
    handledBy: "admin",
    block: "A",
    originalBlock: "A",
    name: "Laptop",
    color: "Black",
    condition: "Used",
    dateFound: today(),
    placeFound: "Block A - Library",
  });

  const matches = await matchingService.findMatchesForLostItem(lost._id, 70);
  assert.equal(matches.length, 1);
  const updatedLost = await LostItem.findById(lost._id);
  const updatedFound = await FoundItem.findById(found._id);
  assert.equal(updatedLost.matchedFoundItemIds.length, 1);
  assert.equal(updatedFound.matchedLostItemIds.length, 1);

  await matchingService.findMatchesForLostItem(lost._id, 70);
  assert.equal(
    (await LostItem.findById(lost._id)).matchedFoundItemIds.length,
    1
  );

  await Notification.create({
    userId: student._id,
    type: "match_found",
    title: "Potential Match Found",
    message: "A possible match was found.",
    data: { lostItemId: lost._id, foundItemId: found._id, matchScore: 100 },
  });
  await assert.rejects(
    Notification.create({
      userId: student._id,
      type: "match_found",
      title: "Duplicate",
      message: "Duplicate notification.",
      data: { lostItemId: lost._id, foundItemId: found._id, matchScore: 100 },
    })
  );
});

test("failed transfer remains retryable, retries successfully, and is idempotent", async () => {
  const admin = await createUser({
    email: "transfer-admin@gwa.amity.edu",
    role: "admin",
    block: "A",
  });
  const found = await FoundItem.create({
    createdBy: admin._id,
    handledBy: "admin",
    block: "A",
    originalBlock: "A",
    recoveryMode: "enquiry_recovered",
    name: "Helmet",
    color: "Black",
    condition: "Used",
    dateFound: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    placeFound: "Block A - Parking",
  });

  const originalUpsert = Notification.findOneAndUpdate;
  let failOnce = true;
  Notification.findOneAndUpdate = (...args) => {
    if (failOnce) {
      failOnce = false;
      throw new Error("simulated notification outage");
    }
    return originalUpsert.apply(Notification, args);
  };

  await runTransferOldItems("integration-failure");
  Notification.findOneAndUpdate = originalUpsert;
  assert.equal(
    (await FoundItem.findById(found._id)).transferState,
    "retryable"
  );

  await runTransferOldItems("integration-retry");
  const completed = await FoundItem.findById(found._id);
  assert.equal(completed.transferState, "completed");
  assert.equal(completed.handledBy, "security");
  assert.equal(
    await Notification.countDocuments({ "data.foundItemId": found._id }),
    1
  );

  await runTransferOldItems("integration-idempotency");
  assert.equal(
    await Notification.countDocuments({ "data.foundItemId": found._id }),
    1
  );
});
