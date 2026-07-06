import express from "express";
import {
  getUserController,
  registerUser,
  UserLoginController,
  userPasswordResetController,
  getAllUsersController,
  updateUserController,
  deleteUserController,
  getDoctorController,
  syncUserFromStaticDb
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/add", registerUser);
userRouter.post("/sync-from-static", syncUserFromStaticDb);

userRouter.post("/login", UserLoginController);

userRouter.post("/get-user", getUserController);

userRouter.post("/forgot-password", userPasswordResetController);
userRouter.get("/get-doctor", getDoctorController);
userRouter.get("/getAllUsers", getAllUsersController);

userRouter.patch("/update/:userId", updateUserController);

userRouter.delete("/delete/:userId", deleteUserController);

export default userRouter;
