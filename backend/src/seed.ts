import sequelize from "./config/database.js";
import { Seat } from "./models/index.js";

const seed = async () => {
  try {
    await sequelize.sync({ alter: true });

    await Seat.bulkCreate(
      [
        {
          seatNumber: "A1",
          price: 500,
          status: "AVAILABLE",
        },
        {
          seatNumber: "A2",
          price: 500,
          status: "AVAILABLE",
        },
        {
          seatNumber: "A3",
          price: 500,
          status: "AVAILABLE",
        },
        {
          seatNumber: "A4",
          price: 1000,
          status: "AVAILABLE",
        },
        {
          seatNumber: "A5",
          price: 1000,
          status: "AVAILABLE",
        },
      ],
      {
        ignoreDuplicates: true,
      }
    );

    console.log("Database seeded successfully");

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();