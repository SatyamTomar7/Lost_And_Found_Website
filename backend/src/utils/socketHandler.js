import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { now } from "mongoose";

const connectedUsers = new Map();
export const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive || !user.isEmailVerified) {
        return next(new Error("Authentication error"));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.user.name} connected`);

    connectedUsers.set(socket.user._id.toString(), {
      socketId: socket.id,
      user: socket.user,
    });
    socket.join(`user_${socket.user._id}`);

    if (socket.user.role == "admin" && socket.user.department) {
      socket.join(
        `dept_${socket.user.department.replace(" ", "_").toLowerCase()}`
      );
    }

    socket.on("join_room", (room) => {
      socket.join(room);
      console.log(`User ${socket.user.name} joined room: ${room}`);
    });

    socket.on("leave_room", (room) => {
      socket.leave(room);
      console.log(`User ${socket.user.name} left room: ${room}`);
    });

    socket.on("notification_received", (notificationId) => {
      console.log(
        `User ${socket.user.name} received notification ${notificationId}`
      );
    });

    socket.on("typing_start", (data) => {
      socket.to(data.room).emit("user_typing", {
        userId: socket.user._id,
        userName: socket.user.name,
      });
    });
    socket.on("typing_stop", (data) => {
      socket.to(data.room).emit("user_stopped_typing", {
        userId: socket.user._id,
      });
    });
    socket.on("update_status", (status) => {
      const userconnection = connectedUsers.get(socket.user._id.toString());
      if (userconnection) {
        userconnection.status = status;

        socket.broadcast.emit("user_status_update", {
          userId: socket.user._id,
          userName: socket.user.name,
          status: status,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.user.name} disconnected`);
      connectedUsers.delete(socket.user._id.toString());

      socket.broadcast.emit("user_status_update", {
        userId: socket.user._id,
        userName: socket.user.name,
        status: "offline",
      });
    });

    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.user.name}:`, error);
    });
  });

  io.sendNotificationToUser = (userId, notification) => {
    io.to(`user_${userId}`).emit("new_notification", notification);
  };

  io.sendNotificationToDepartment = (department, notification) => {
    const roomName = `dept_${department.replace(" ", "_").toLowerCase()}`;
    io.to(roomName).emit("department_notification", notification);
  };

  io.broadcastSystemAlert = (message, priority = "medium") => {
    io.emit("system_alert", {
      message,
      priority,
      timestamp: new Date().toISOString(),
    });
  };

  io.getConnectedUsers = () => {
    return Array.from(connectedUsers.values()).map((conn) => ({
      userId: conn.user._id,
      userName: conn.user.name,
      role: conn.user.role,
      department: conn.user.department,
      status: conn.status || "online",
    }));
  };
  io.isUserOnline = (userId) => {
    return connectedUsers.has(userId.toString());
  };
  console.log("🔌 Socket.io handler initialized");
};
