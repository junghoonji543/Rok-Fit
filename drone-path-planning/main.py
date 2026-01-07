import heapq
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Button, RadioButtons
from matplotlib.patches import Circle, Rectangle
import matplotlib.colors as mcolors


class Node:
    """Node class for A* path planning"""
    def __init__(self, position, parent=None):
        self.position = position
        self.parent = parent
        self.g = 0  # Cost from start to current node
        self.h = 0  # Heuristic cost to end
        self.f = 0  # Total cost

    def __eq__(self, other):
        return self.position == other.position

    def __lt__(self, other):
        return self.f < other.f


def heuristic(a, b):
    """Manhattan distance heuristic for 2D grid"""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def get_neighbors(node, grid_size):
    """Get valid neighboring positions (4-directional movement)"""
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # right, down, left, up
    neighbors = []

    for direction in directions:
        new_pos = (node.position[0] + direction[0], node.position[1] + direction[1])

        # Check boundaries
        if 0 <= new_pos[0] < grid_size[0] and 0 <= new_pos[1] < grid_size[1]:
            neighbors.append(new_pos)

    return neighbors


def a_star(start, end, obstacles, grid_size):
    """A* path planning algorithm"""
    start_node = Node(start)
    end_node = Node(end)

    open_list = []
    closed_list = set()

    heapq.heappush(open_list, start_node)

    while open_list:
        current_node = heapq.heappop(open_list)
        closed_list.add(current_node.position)

        # Found the goal
        if current_node == end_node:
            path = []
            current = current_node
            while current is not None:
                path.append(current.position)
                current = current.parent
            return path[::-1]  # Return reversed path

        # Explore neighbors
        for neighbor_pos in get_neighbors(current_node, grid_size):
            if neighbor_pos in closed_list:
                continue

            # Check if neighbor is an obstacle
            if neighbor_pos in obstacles:
                continue

            neighbor = Node(neighbor_pos, current_node)
            neighbor.g = current_node.g + 1
            neighbor.h = heuristic(neighbor.position, end_node.position)
            neighbor.f = neighbor.g + neighbor.h

            # Check if this path to neighbor is better
            existing_node = None
            for node in open_list:
                if node == neighbor:
                    existing_node = node
                    break

            if existing_node is None or neighbor.g < existing_node.g:
                if existing_node:
                    open_list.remove(existing_node)
                heapq.heappush(open_list, neighbor)

    return None  # No path found


class DronePathSimulation:
    """Interactive drone path planning simulation"""

    def __init__(self, grid_size=(20, 20)):
        self.grid_size = grid_size
        self.start = (0, 0)
        self.end = (grid_size[0] - 1, grid_size[1] - 1)
        self.obstacles = set()
        self.path = None
        self.click_mode = 'obstacle'  # 'obstacle', 'start', 'end'

        # Create figure
        self.fig, self.ax = plt.subplots(figsize=(10, 10))

        # Create grid visualization
        self.grid = np.zeros(grid_size)
        self.im = self.ax.imshow(self.grid, cmap='gray', origin='lower',
                                 extent=(0, grid_size[1], 0, grid_size[0]), vmin=0, vmax=1)

        # Setup interactive elements
        self.setup_ui()
        self.setup_click_handler()

        # Calculate initial path
        self.update_path()

        plt.show()

    def setup_ui(self):
        """Setup UI elements (buttons and instructions)"""
        # Adjust plot to make room for widgets
        plt.subplots_adjust(left=0.05, bottom=0.25, right=0.95, top=0.95)

        # Instruction text
        instruction = """
        Click on grid to:
        - Left click: Place/remove obstacle
        - Right click: Set start point
        - Middle click (or Shift+click): Set end point
        """
        self.fig.text(0.02, 0.98, instruction, fontsize=9, verticalalignment='top',
                     bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

        # Clear obstacles button
        ax_clear = plt.axes((0.15, 0.1, 0.2, 0.05))
        self.btn_clear = Button(ax_clear, 'Clear Obstacles')
        self.btn_clear.on_clicked(self.clear_obstacles)

        # Reset button
        ax_reset = plt.axes((0.4, 0.1, 0.2, 0.05))
        self.btn_reset = Button(ax_reset, 'Reset All')
        self.btn_reset.on_clicked(self.reset_all)

        # Random obstacles button
        ax_random = plt.axes((0.65, 0.1, 0.2, 0.05))
        self.btn_random = Button(ax_random, 'Random Obstacles')
        self.btn_random.on_clicked(self.generate_random_obstacles)

        # Axis labels
        self.ax.set_xlabel('Y Position')
        self.ax.set_ylabel('X Position')
        self.ax.set_title('Drone Path Planning - A* Algorithm')

    def setup_click_handler(self):
        """Setup mouse click handler"""
        self.fig.canvas.mpl_connect('button_press_event', self.on_click)

    def on_click(self, event):
        """Handle mouse clicks on the grid"""
        if event.inaxes != self.ax:
            return

        x = int(event.xdata)
        y = int(event.ydata)

        # Check bounds
        if not (0 <= x < self.grid_size[0] and 0 <= y < self.grid_size[1]):
            return

        # Handle different click types
        if event.button == 1:  # Left click - toggle obstacle
            if (x, y) == self.start or (x, y) == self.end:
                return  # Can't place obstacle on start or end
            if (x, y) in self.obstacles:
                self.obstacles.remove((x, y))
            else:
                self.obstacles.add((x, y))
        elif event.button == 3:  # Right click - set start
            if (x, y) in self.obstacles:
                self.obstacles.remove((x, y))
            self.start = (x, y)
        elif event.button == 2 or (event.button == 1 and event.key == 'shift'):  # Middle click or Shift+click - set end
            if (x, y) in self.obstacles:
                self.obstacles.remove((x, y))
            self.end = (x, y)

        self.update_path()
        self.update_visualization()

    def update_path(self):
        """Calculate path using A* algorithm"""
        self.path = a_star(self.start, self.end, self.obstacles, self.grid_size)

    def update_visualization(self):
        """Update the grid visualization"""
        # Update obstacle grid
        self.grid = np.zeros(self.grid_size)
        for obs in self.obstacles:
            self.grid[obs] = 1

        self.im.set_data(self.grid)

        # Clear previous path and markers
        for artist in list(self.ax.patches):
            artist.remove()
        for line in list(self.ax.lines):
            line.remove()

        # Draw path
        if self.path:
            path_x = [p[1] for p in self.path]  # y for x-axis
            path_y = [p[0] for p in self.path]  # x for y-axis
            self.ax.plot(path_x, path_y, 'b-', linewidth=3, alpha=0.7, label='Path')
            self.ax.plot(path_x, path_y, 'bo', markersize=4, alpha=0.5)

        # Draw start point (green)
        start_circle = Circle((self.start[1] + 0.5, self.start[0] + 0.5), 0.4,
                              color='green', alpha=0.8, label='Start')
        self.ax.add_patch(start_circle)

        # Draw end point (red)
        end_circle = Circle((self.end[1] + 0.5, self.end[0] + 0.5), 0.4,
                            color='red', alpha=0.8, label='End')
        self.ax.add_patch(end_circle)

        # Update title with path info
        if self.path:
            self.ax.set_title(f'Drone Path Planning - Path found! Length: {len(self.path)} steps')
        else:
            self.ax.set_title('Drone Path Planning - No path found!')

        self.fig.canvas.draw()

    def clear_obstacles(self, event):
        """Clear all obstacles"""
        self.obstacles.clear()
        self.update_path()
        self.update_visualization()

    def reset_all(self, event):
        """Reset to initial state"""
        self.obstacles.clear()
        self.start = (0, 0)
        self.end = (self.grid_size[0] - 1, self.grid_size[1] - 1)
        self.update_path()
        self.update_visualization()

    def generate_random_obstacles(self, event):
        """Generate random obstacles"""
        self.obstacles.clear()
        num_obstacles = int(0.2 * self.grid_size[0] * self.grid_size[1])  # 20% of grid

        while len(self.obstacles) < num_obstacles:
            x = np.random.randint(0, self.grid_size[0])
            y = np.random.randint(0, self.grid_size[1])

            # Don't place obstacles on start or end
            if (x, y) != self.start and (x, y) != self.end:
                self.obstacles.add((x, y))

        self.update_path()
        self.update_visualization()


def main():
    """Main function to run the simulation"""
    print("=" * 60)
    print("Drone Path Planning Simulation - A* Algorithm")
    print("=" * 60)
    print("\nInstructions:")
    print("- Left click on grid: Add/Remove obstacle")
    print("- Right click on grid: Set start point (green)")
    print("- Middle click or Shift+click: Set end point (red)")
    print("- Use buttons at bottom: Clear obstacles, Reset, Generate random obstacles")
    print("\nPress 'q' in the terminal to quit")
    print("=" * 60)

    # Create and run simulation
    sim = DronePathSimulation(grid_size=(20, 20))


if __name__ == "__main__":
    main()
