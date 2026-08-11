import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class Reservation extends Model {
  declare id: number;
  declare clientId: string;
  declare status:
    | "HOLDING"
    | "PAYMENT_PROCESSING"
    | "CONFIRMED"
    | "EXPIRED"
    | "PAYMENT_FAILED";

  declare subtotal: number;
  declare discount: number;
  declare total: number;
  declare expiresAt: Date | null;
}

Reservation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    clientId: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "HOLDING",
        "PAYMENT_PROCESSING",
        "CONFIRMED",
        "EXPIRED",
        "PAYMENT_FAILED"
      ),
      defaultValue: "HOLDING",
    },

    subtotal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    discount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    total: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "reservations",
    timestamps: true,
  }
);

export default Reservation;