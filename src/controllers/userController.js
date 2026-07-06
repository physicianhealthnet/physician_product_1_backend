import { createDBService } from "../services/db.service.js";
import User from "../models/user.model.js";
import Doctor from "../models/doctor.model.js";
import Staff from "../models/staff.model.js";
import Patient from "../models/patientModel/patient.model.js";
import clinicData from "../models/clinics.model.js";
import bcrypt from "bcryptjs";

const userService = createDBService(User);

export const registerUser = async (req, res) => {
  try {
    const latestUser = await User.findOne({ isDeleted: false })
      .sort({ createdAt: -1 })
      .select("userId");

    let nextUserNumber = 1;
    if (latestUser && latestUser.userId) {
      const splitId = latestUser.userId.split("-");
      const number = parseInt(splitId[1]);
      if (!isNaN(number)) {
        nextUserNumber = number + 1;
      }
    }

    const userId = `USER-${nextUserNumber}`;
    req.body.userId = userId;

    const unhashedPassword = req.body.password;
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // Salt rounds = 10
    req.body.password = hashedPassword; // Store hashed password

    // Create the new user
    const user = await userService.create(req.body);

    // Save directly to Doctor/Staff models in Product DB
    if (user.userType === 'doctor' || user.userType === 'master') {
      const existingDoc = await Doctor.findOne({ $or: [{ phone: user.phone }, { email: user.email }] });
      if (!existingDoc) {
        const lastDoctor = await Doctor.findOne().sort({ createdAt: -1 });
        let num = 1;
        if (lastDoctor && lastDoctor.doctorId) {
          const split = lastDoctor.doctorId.split("-");
          const n = parseInt(split[2] || split[1]);
          if (!isNaN(n)) num = n + 1;
        }
        await Doctor.create({
          doctorId: `PHN-DR-${String(num).padStart(4, "0")}`,
          doctorName: user.userName,
          department: req.body.department || "General",
          clinicId: user.clinicId,
          phone: user.phone,
          email: user.email,
          password: hashedPassword,
        });
      }
    } else {
      const existingStaff = await Staff.findOne({ phone: user.phone });
      if (!existingStaff) {
        const lastStaff = await Staff.findOne().sort({ createdAt: -1 });
        let num = 1;
        if (lastStaff && lastStaff.staffId) {
          const split = lastStaff.staffId.split("-");
          const n = parseInt(split[2] || split[1]);
          if (!isNaN(n)) num = n + 1;
        }
        await Staff.create({
          staffId: `PHN-ST-${String(num).padStart(4, "0")}`,
          name: user.userName,
          role: (user.userType?.charAt(0).toUpperCase() + user.userType?.slice(1)) || "Receptionist",
          clinicId: user.clinicId,
          phone: user.phone,
          password: hashedPassword,
        });
      }
    }

    // Sync to secondary backend (Static DB) without awaiting it to avoid slowing down response
    try {
      fetch('http://dependencyforphn.physicianhealthnet.com/api/doctor/sync-from-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType: user.userType,
          userName: user.userName,
          phone: user.phone,
          email: user.email,
          clinicId: user.clinicId,
          department: req.body.department || 'General',
          password: unhashedPassword || 'Password123'
        })
      }).catch(e => console.error("Error syncing to secondary db", e));
    } catch (err) {
      console.error("Fetch failed", err);
    }

    return res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const syncUserFromStaticDb = async (req, res) => {
  try {
    const users = req.body.users;
    const clinic = req.body.clinic;

    if (clinic && clinic.clinicId) {
      const existingClinic = await clinicData.findOne({ clinicId: clinic.clinicId, isDeleted: false });
      if (!existingClinic) {
        await clinicData.create({
          clinicId: clinic.clinicId,
          clinicName: clinic.clinicName || "Unknown",
          clinicAddress: clinic.clinicAddress || "",
          clinicPhone: clinic.clinicPhone || "",
          clinicEmail: clinic.clinicEmail || "",
        });
      } else {
        await clinicData.findOneAndUpdate(
          { clinicId: clinic.clinicId },
          {
            $set: {
              clinicName: clinic.clinicName || existingClinic.clinicName,
              clinicAddress: clinic.clinicAddress || existingClinic.clinicAddress,
              clinicPhone: clinic.clinicPhone || existingClinic.clinicPhone,
              clinicEmail: clinic.clinicEmail || existingClinic.clinicEmail,
            }
          }
        );
      }
    }

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    let latestUser = await User.findOne({ isDeleted: false })
      .sort({ createdAt: -1 })
      .select("userId");
      
    let nextUserNumber = 1;
    if (latestUser && latestUser.userId) {
      const splitId = latestUser.userId.split("-");
      const number = parseInt(splitId[1]);
      if (!isNaN(number)) {
        nextUserNumber = number + 1;
      }
    }

    const docsToInsert = [];
    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const password = await bcrypt.hash(u.password || u.phone || 'Password123', 10);
        docsToInsert.push({
          userId: `USER-${nextUserNumber++}`,
          userName: u.userName,
          userType: u.userType,
          password: password,
          email: u.email,
          phone: u.phone,
          clinicId: u.clinicId,
          department: u.department || 'General',
        });

        // Save to specific Doctor/Staff models as well
        if (u.userType === 'doctor' || u.userType === 'master') {
          const existingDoc = await Doctor.findOne({ $or: [{ phone: u.phone }, { email: u.email }] });
          if (!existingDoc) {
            const lastDoctor = await Doctor.findOne().sort({ createdAt: -1 });
            let num = 1;
            if (lastDoctor && lastDoctor.doctorId) {
              const split = lastDoctor.doctorId.split("-");
              const n = parseInt(split[2] || split[1]);
              if (!isNaN(n)) num = n + 1;
            }
            await Doctor.create({
              doctorId: `PHN-DR-${String(num).padStart(4, "0")}`,
              doctorName: u.userName,
              department: u.department || "General",
              clinicId: u.clinicId,
              phone: u.phone,
              email: u.email,
              password: password,
            });
          }
        } else {
          const existingStaff = await Staff.findOne({ phone: u.phone });
          if (!existingStaff) {
            const lastStaff = await Staff.findOne().sort({ createdAt: -1 });
            let num = 1;
            if (lastStaff && lastStaff.staffId) {
              const split = lastStaff.staffId.split("-");
              const n = parseInt(split[2] || split[1]);
              if (!isNaN(n)) num = n + 1;
            }
            await Staff.create({
              staffId: `PHN-ST-${String(num).padStart(4, "0")}`,
              name: u.userName,
              role: (u.userType?.charAt(0).toUpperCase() + u.userType?.slice(1)) || "Receptionist",
              clinicId: u.clinicId,
              phone: u.phone,
              password: password,
            });
          }
        }
      }
    }

    if (docsToInsert.length > 0) {
      await User.insertMany(docsToInsert);
    }

    res.status(200).json({ message: "Users synced successfully", count: docsToInsert.length });
  } catch (error) {
    res.status(500).json({ message: "Sync error", error: error.message });
  }
};

export const updateUserController = async (req, res) => {
  try {
    const { userId } = req.params; // Pass userId in params
    const updateData = req.body;

    if (updateData.password) {
      delete updateData.password;
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      updateData,
      { new: true } // return updated doc
    ).select("-password"); // exclude password

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// ✅ Delete user
export const deleteUserController = async (req, res) => {
  try {
    const { userId } = req.params; // Pass userId in params

    const deletedUser = await User.findOneAndUpdate(
      { userId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully",
      userId: deletedUser.userId,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const UserLoginController = async (req, res) => {
  try {
    const { email, password, userType, department } = req.body;

    // Input validation
    if (!email || !password || !userType) {
      return res
        .status(400)
        .json({ message: "Credential, password and user type are required" });
    }

    // Find user by email or phone
    const query = {
      $or: [{ email: email }, { phone: email }],
      userType,
      isDeleted: false,
    };

    if (department) {
      query.department = department;
    }

    let user;
    if (userType === "patient") {
      const patientQuery = {
        $or: [{ patientEmail: email }, { patientPhone: email }],
        isDeleted: false,
      };
      user = await Patient.findOne(patientQuery);
    } else {
      user = await User.findOne(query);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    // Return success response with user details (excluding password)
    const { password: _, ...userDetails } = user.toObject();
    return res.status(200).json({
      message: "Login successful",
      user: userDetails,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getUserController = async (req, res) => {
  try {
    const { userName, email } = req.body;

    // ✅ Step 1: Validate input first
    if (!userName && !email) {
      return res
        .status(400)
        .json({ message: "User name or email is required" });
    }

    // ✅ Step 2: Call getOne with whichever field(s) is present
    const user = await userService.getOne({
      userName,
      email,
      isDeleted: false,
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const userPasswordResetController = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    // Input validation
    if (!email || !password || !userType) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }

    // Find user by email
    const user = await userService.getOne({
      email,
      userType,
      isDeleted: false,
    });
    if (!user || !userType) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: "Password reset successful",
      userId: user.userId,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const user = await userService.getAll({ isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getDoctorController = async (req, res) => {
  try {
    const { clinicId } = req.query;

    // ✅ Step 1: Validate input
    if (!clinicId) {
      return res.status(400).json({ message: "clinicId is required" });
    }

    // ✅ Step 2: Fetch only Doctor and master users for this clinic
    const users = await User.find(
      {
        clinicId,
        userType: { $in: ["doctor", "master"] },
        isDeleted: false,
      },
      {
        _id: 1,
        userId: 1,
        userName: 1,
        userType: 1,
      }
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    return res.status(200).json({
      message: "Users fetched successfully",
      users,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
