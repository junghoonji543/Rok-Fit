"""Test script to verify A* algorithm works correctly"""

import numpy as np
from main import a_star, heuristic

def test_a_star_simple():
    """Test A* on a simple grid without obstacles"""
    grid_size = (10, 10)
    start = (0, 0)
    end = (9, 9)
    obstacles = set()

    path = a_star(start, end, obstacles, grid_size)

    assert path is not None, "Path should be found"
    assert path[0] == start, "Path should start at start position"
    assert path[-1] == end, "Path should end at end position"
    print(f"[OK] Simple path test passed. Path length: {len(path)}")

def test_a_star_with_obstacles():
    """Test A* with obstacles"""
    grid_size = (10, 10)
    start = (0, 0)
    end = (9, 9)
    # Create obstacles with a gap (at y=5) so path exists
    obstacles = {(5, 0), (5, 1), (5, 2), (5, 3), (5, 4),
                  (5, 6), (5, 7), (5, 8), (5, 9)}  # Vertical wall with gap at y=5

    path = a_star(start, end, obstacles, grid_size)

    assert path is not None, "Path should be found even with obstacles"
    assert path[0] == start, "Path should start at start position"
    assert path[-1] == end, "Path should end at end position"

    # Verify path doesn't go through obstacles
    for pos in path:
        assert pos not in obstacles, f"Path goes through obstacle at {pos}"

    print(f"[OK] Obstacle test passed. Path length: {len(path)}")

def test_a_star_no_path():
    """Test A* when no path exists"""
    grid_size = (10, 10)
    start = (0, 0)
    end = (9, 9)
    # Create a complete wall blocking all paths from (0,0) to (9,9)
    obstacles = {(5, 0), (5, 1), (5, 2), (5, 3), (5, 4), (5, 5),
                  (5, 6), (5, 7), (5, 8), (5, 9)}  # Complete vertical wall

    path = a_star(start, end, obstacles, grid_size)

    assert path is None, "No path should be found when completely blocked"
    print("[OK] No path test passed")

def test_heuristic():
    """Test Manhattan distance heuristic"""
    result = heuristic((0, 0), (3, 4))
    expected = 3 + 4  # Manhattan distance
    assert result == expected, f"Heuristic should be {expected}, got {result}"
    print("[OK] Heuristic test passed")

if __name__ == "__main__":
    print("=" * 60)
    print("Running A* Algorithm Tests")
    print("=" * 60)

    test_heuristic()
    test_a_star_simple()
    test_a_star_with_obstacles()
    test_a_star_no_path()

    print("=" * 60)
    print("All tests passed!")
    print("=" * 60)
