// controllers/carController.js

// Dummy car fleet data
const FLEET = [
  { _id: "1", name: "Tesla Model 3", type: "ev", price: 89,  image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800" },
  { _id: "2", name: "BMW X5",       type: "luxury", price: 120, image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800" },
  { _id: "3", name: "Audi A4",      type: "sedan", price: 75,  image: "https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?auto=format&fit=crop&w=800" },

  { _id: "4", name: "Tesla Model Y", type: "ev", price: 109, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800" },
  { _id: "5", name: "Mercedes C-Class", type: "luxury", price: 115, image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800" },
  { _id: "6", name: "Toyota Camry", type: "sedan", price: 62, image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800" },

  { _id: "7", name: "Hyundai Elantra", type: "sedan", price: 55, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800" },
  { _id: "8", name: "Lexus RX", type: "luxury", price: 135, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800" },
  { _id: "9", name: "Polestar 2", type: "ev", price: 95, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800" },

  { _id: "10", name: "Kia K5", type: "sedan", price: 60, image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=800" },
  { _id: "11", name: "Porsche Macan", type: "luxury", price: 160, image: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800" },
  { _id: "12", name: "Chevy Bolt EV", type: "ev", price: 70, image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800" },
];

// GET /api/cars?type=all
exports.getCars = (req, res) => {
    try {
        const { type } = req.query; // read type query param

        if (type && type !== "all") {
            const filteredCars = FLEET.filter((car) => car.type === type);
            return res.json(filteredCars);
        }

        res.json(FLEET);
    } catch (error) {
        res.status(500).json({ message: "Server error while fetching cars" });
    }
};

// GET /api/cars/:id
exports.getCarById = (req, res) => {
    try {
        const { id } = req.params;
        const { location = "", pickupDate = "", returnDate = "" } = req.query;
        const car = FLEET.find((c) => c._id === id);

        if (!car) {
            return res.status(404).json({ message: "Car not found" });
        }

       return res.json({
      ...car,
      location,
      pickupDate,
      returnDate,
    });
    } catch (error) {
        res.status(500).json({ message: "Server error while fetching car" });
    }
};

exports.searchCars = (req, res) => {
  try {
    const { type = "all", location = "", pickupDate = "", returnDate = "" } = req.query;

    let cars = [...FLEET];
    if (type && type !== "all") cars = cars.filter((c) => c.type === type);

    return res.json({
      cars: cars.map((c) => ({ ...c, location, pickupDate, returnDate })),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while searching cars" });
  }
};

