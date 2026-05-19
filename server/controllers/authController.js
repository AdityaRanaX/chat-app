import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, age, phone } = req.body;

    if (!name || !email || !password || !age || !phone) {
      return res.status(400).json({
        message: "Please fill all fields",
      });
    }

    const normalizedAge = Number(age);

    if (Number.isNaN(normalizedAge) || normalizedAge < 1) {
      return res.status(400).json({
        message: "Please enter a valid age",
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      age: normalizedAge,
      phone,
    });

    res.status(201).json({
      message: "User registered successfully",
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      phone: user.phone,
      profilePic: user.profilePic,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please fill all fields",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    res.status(200).json({
      message: "Login successful",
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      phone: user.phone,
      profilePic: user.profilePic,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { name, age, phone, profilePic } = req.body;

    user.name = name ?? user.name;
    user.age = age !== undefined ? Number(age) : user.age;
    user.phone = phone ?? user.phone;
    user.profilePic = profilePic ?? user.profilePic;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      phone: updatedUser.phone,
      profilePic: updatedUser.profilePic,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};