const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel");

mongoose
  .connect("mongodb://localhost:27017/okurmen_test")
  .then(async () => {
    const hashedPassword = await bcrypt.hash("okurmen123", 10);

    // Use new Admin() + save() instead of Admin.create()
    const admin = new Admin({
      email: "admin@example.com",
      password: hashedPassword,
    });
    
    await admin.save();
    console.log("Админ кошулду:", admin.email);
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
  });
