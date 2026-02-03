const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/adminModel"); // модель жолун текшер

mongoose
  .connect(process.env.MONGO_URI || "mongodb+srv://alisermanasov00_db_user:9tENPqoFBCPbY57F@cluster1.xmwvnzs.mongodb.net/?appName=Cluster1")
  .then(async () => {
    const hashedPassword = await bcrypt.hash("okurmen2021", 10);

    const admin = new Admin({
      email: "admin@okurmen.kg",
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