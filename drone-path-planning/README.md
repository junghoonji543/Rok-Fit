# Drone Path Planning Simulation

A 2D drone path planning simulation using the A* (A-Star) algorithm with interactive visualization.

## Features

- **A* Path Planning Algorithm**: Efficient pathfinding with Manhattan distance heuristic
- **Interactive Grid Visualization**: 20x20 grid with real-time path updates
- **Mouse Interaction**:
  - Left click: Add/Remove obstacles
  - Right click: Set start point (green)
  - Middle click (or Shift+click): Set end point (red)
- **Control Buttons**:
  - Clear Obstacles: Remove all obstacles
  - Reset All: Reset to initial state
  - Random Obstacles: Generate random obstacle placement (20% of grid)

## Requirements

- Python 3.8 or higher
- numpy
- matplotlib

## Installation

1. Navigate to the project directory:
```bash
cd drone-path-planning
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Or install manually:
```bash
pip install numpy matplotlib
```

## Usage

### Run the Interactive Simulation

```bash
python main.py
```

This will launch an interactive window where you can:
- Click on the grid to add/remove obstacles
- Set start and end points
- Use the buttons to clear or reset the simulation
- Generate random obstacles for testing

### Run Tests

```bash
python test.py
```

This runs unit tests to verify the A* algorithm works correctly.

## Algorithm Details

### A* Algorithm

The simulation uses the A* pathfinding algorithm:
- **f(n) = g(n) + h(n)**
  - g(n): Cost from start to node n
  - h(n): Heuristic cost from node n to goal (Manhattan distance)
  - f(n): Total estimated cost

- **Movement**: 4-directional (up, down, left, right)
- **Obstacle Handling**: Nodes marked as obstacles are not expanded
- **Completeness**: Guaranteed to find shortest path if one exists

## Project Structure

```
drone-path-planning/
├── main.py           # Main simulation with interactive UI
├── test.py           # Unit tests for A* algorithm
├── requirements.txt  # Python dependencies
└── README.md        # This file
```

## Future Enhancements

- 3D space simulation
- Diagonal movement support (8-directional)
- Multiple drone path planning
- Real-time animation of path execution
- Export paths to file
- Additional path planning algorithms (Dijkstra, RRT, etc.)

## License

This project is open source and available for educational purposes.
