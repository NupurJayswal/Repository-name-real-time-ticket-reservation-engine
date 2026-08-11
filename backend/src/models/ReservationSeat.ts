import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class ReservationSeat extends Model {
  declare id: number;
  declare reservationId: number;
  declare seatId: number;
  declare price: number;
}

ReservationSeat.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    reservationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    seatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "reservation_seats",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["reservationId", "seatId"],
      },
    ],
  }
);

export default ReservationSeat;