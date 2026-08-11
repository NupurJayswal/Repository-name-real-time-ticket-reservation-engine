import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class Payment extends Model {
  declare id: number;
  declare reservationId: number;
  declare amount: number;
  declare status: "PROCESSING" | "SUCCESS" | "FAILED";
}

Payment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },

    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("PROCESSING", "SUCCESS", "FAILED"),
      defaultValue: "PROCESSING",
    },
  },
  {
    sequelize,
    tableName: "payments",
    timestamps: true,
  }
);

export default Payment;