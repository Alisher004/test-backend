const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel");

mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/okurmen_test")
  .then(async () => {
    const email = "admin@example.com";

    // Эски админ бар болсо өчүрүү
    await Admin.deleteMany({ email });

    const hashedPassword = await bcrypt.hash("okurmen123", 10);
    const admin = new Admin({ email, password: hashedPassword });

    await admin.save();
    console.log("✅ Админ кошулду:", admin.email);

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    mongoose.disconnect();
    process.exit(1);
  });