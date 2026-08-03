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
    const allUsers = await User.find({}, { userId: 1 });
    let maxId = 0;
    allUsers.forEach(u => {
      if (u.userId && u.userId.startsWith("USER-")) {
        const num = parseInt(u.userId.split("-")[1], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    });
    const nextUserNumber = maxId + 1;

    const userId = `USER-${nextUserNumber}`;
    req.body.userId = userId;

    const unhashedPassword = req.body.password;
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // Salt rounds = 10
    req.body.password = hashedPassword; // Store hashed password

    // Create the new user
    const user = await userService.create(req.body);

    // Save directly to Doctor/Staff models in Product DB
    if (user.userType === 'doctor' || user.userType === 'master') {
      const existingDoc = await Doctor.findOne({ $or: [{ phone: user.phone }, { email: user.email }], role: user.userType });
      if (!existingDoc) {
        const allDoctors = await Doctor.find({}, { doctorId: 1 });
        let maxDocId = 0;
        allDoctors.forEach(d => {
          if (d.doctorId && d.doctorId.includes("-")) {
            const parts = d.doctorId.split("-");
            const n = parseInt(parts[2] || parts[1], 10);
            if (!isNaN(n) && n > maxDocId) {
              maxDocId = n;
            }
          }
        });
        const num = maxDocId + 1;
        const prefix = user.userType === 'master' ? 'PHN-MS' : 'PHN-DR';
        await Doctor.create({
          doctorId: `${prefix}-${String(num).padStart(4, "0")}`,
          doctorName: user.userName,
          department: req.body.department || "General",
          clinicId: user.clinicId,
          phone: user.phone,
          email: user.email,
          password: hashedPassword,
          role: user.userType
        });
      }
    } else {
      const existingStaff = await Staff.findOne({ phone: user.phone });
      if (!existingStaff) {
        const allStaffs = await Staff.find({}, { staffId: 1 });
        let maxStaffId = 0;
        allStaffs.forEach(s => {
          if (s.staffId && s.staffId.includes("-")) {
            const parts = s.staffId.split("-");
            const n = parseInt(parts[2] || parts[1], 10);
            if (!isNaN(n) && n > maxStaffId) {
              maxStaffId = n;
            }
          }
        });
        const num = maxStaffId + 1;
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

    const allUsers = await User.find({}, { userId: 1 });
    let maxId = 0;
    allUsers.forEach(u => {
      if (u.userId && u.userId.startsWith("USER-")) {
        const num = parseInt(u.userId.split("-")[1], 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    });
    let nextUserNumber = maxId + 1;

    for (const u of users) {
      // Find existing user of the same type by email/phone to prevent duplicates
      let userDoc = await User.findOne({
        $or: [{ email: u.email }, { phone: u.phone }],
        userType: u.userType,
        isDeleted: false
      });

      let password = u.password;
      if (password && !password.startsWith("$2")) {
        password = await bcrypt.hash(password, 10);
      } else if (!password) {
        password = await bcrypt.hash(u.phone || 'Password123', 10);
      }

      if (!userDoc) {
        const newUserId = `USER-${nextUserNumber++}`;
        userDoc = await User.create({
          userId: newUserId,
          userName: u.userName,
          userType: u.userType,
          password: password,
          email: u.email,
          phone: u.phone,
          clinicId: u.clinicId,
          department: u.department || 'General',
          isFirstLogin: true,
        });
      } else {
        // Update existing user record
        userDoc.userName = u.userName;
        userDoc.phone = u.phone;
        userDoc.email = u.email;
        userDoc.clinicId = u.clinicId;
        if (u.department) {
          userDoc.department = u.department;
        }
        if (u.password) {
          userDoc.password = password;
        }
        await userDoc.save();
      }

      // Save/Update specific Doctor/Staff models as well
      if (u.userType === 'doctor' || u.userType === 'master') {
        let existingDoc = await Doctor.findOne({
          $or: [{ phone: u.phone }, { email: u.email }],
          role: u.userType
        });

        if (!existingDoc) {
          existingDoc = await Doctor.findOne({
            $or: [{ phone: u.phone }, { email: u.email }]
          });
        }

        if (!existingDoc) {
          const allDoctors = await Doctor.find({}, { doctorId: 1 });
          let maxDocId = 0;
          allDoctors.forEach(d => {
            if (d.doctorId && d.doctorId.includes("-")) {
              const parts = d.doctorId.split("-");
              const n = parseInt(parts[2] || parts[1], 10);
              if (!isNaN(n) && n > maxDocId) {
                maxDocId = n;
              }
            }
          });
          const num = maxDocId + 1;
          const prefix = u.userType === 'master' ? 'PHN-MS' : 'PHN-DR';
          await Doctor.create({
            doctorId: `${prefix}-${String(num).padStart(4, "0")}`,
            doctorName: u.userName,
            department: u.department || "General",
            clinicId: u.clinicId,
            phone: u.phone,
            email: u.email,
            password: password,
            role: u.userType
          });
        } else {
          existingDoc.doctorName = u.userName;
          existingDoc.phone = u.phone;
          existingDoc.email = u.email;
          existingDoc.clinicId = u.clinicId;
          existingDoc.role = u.userType;
          if (u.department) {
            existingDoc.department = u.department;
          }
          if (u.password) {
            existingDoc.password = password;
          }
          await existingDoc.save();
        }
      } else {
        const roleName = (u.userType?.charAt(0).toUpperCase() + u.userType?.slice(1)) || "Receptionist";
        let existingStaff = await Staff.findOne({ phone: u.phone });
        if (!existingStaff) {
          const allStaffs = await Staff.find({}, { staffId: 1 });
          let maxStaffId = 0;
          allStaffs.forEach(s => {
            if (s.staffId && s.staffId.includes("-")) {
              const parts = s.staffId.split("-");
              const n = parseInt(parts[2] || parts[1], 10);
              if (!isNaN(n) && n > maxStaffId) {
                maxStaffId = n;
              }
            }
          });
          const num = maxStaffId + 1;
          await Staff.create({
            staffId: `PHN-ST-${String(num).padStart(4, "0")}`,
            name: u.userName,
            role: roleName,
            clinicId: u.clinicId,
            phone: u.phone,
            password: password,
          });
        } else {
          existingStaff.name = u.userName;
          existingStaff.role = roleName;
          existingStaff.clinicId = u.clinicId;
          if (u.password) {
            existingStaff.password = password;
          }
          await existingStaff.save();
        }
      }
    }

    res.status(200).json({ message: "Users synced successfully" });
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

export const setUserPasswordController = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: "UserId and password are required" });
    }

    const user = await User.findOne({ userId, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isFirstLogin = false;
    await user.save();

    // Also update corresponding Doctor/Staff password if relevant
    if (user.userType === 'doctor' || user.userType === 'master') {
      await Doctor.findOneAndUpdate(
        { $or: [{ phone: user.phone }, { email: user.email }], role: user.userType },
        { $set: { password: hashedPassword } }
      );
    } else {
      await Staff.findOneAndUpdate(
        { phone: user.phone },
        { $set: { password: hashedPassword } }
      );
    }

    const { password: _, ...userDetails } = user.toObject();
    return res.status(200).json({
      message: "Password set successfully",
      user: userDetails,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const checkNewAccountController = async (req, res) => {
  try {
    const { email, userType, department } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ message: "Email and userType are required" });
    }

    const query = {
      $or: [{ email: email }, { phone: email }],
      userType,
      isDeleted: false,
    };

    if (userType === "doctor" && department) {
      query.department = department;
    }

    const user = await User.findOne(query);
    if (user && user.isFirstLogin) {
      const { password: _, ...userDetails } = user.toObject();
      return res.status(200).json({
        isNewAccount: true,
        user: userDetails,
      });
    }

    return res.status(200).json({
      isNewAccount: false,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
