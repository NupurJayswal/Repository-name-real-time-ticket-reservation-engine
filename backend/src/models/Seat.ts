import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class Seat extends Model {
  declare id: number;
  declare seatNumber: string;
  declare price: number;
  declare status: "AVAILABLE" | "HELD" | "BOOKED";
  declare heldUntil: Date | null;
}

Seat.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    seatNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("AVAILABLE", "HELD", "BOOKED"),
      defaultValue: "AVAILABLE",
    },

    heldUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "seats",
    timestamps: true,
  }
);

export default Seat;