import SeatMap from "./components/SeatMap";

function App() {
  return (
    <div className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            Ticket Reservation
          </h1>

          <p className="mt-2 text-slate-500">
            Select your seats
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow">
          <SeatMap />
        </div>
      </div>
    </div>
  );
}

export default App;