"""
Main application entry point for the Glass Recommendation System.

Usage examples
--------------
  python app.py --face-shape oval --age 8
  python app.py --face-shape round --age 70
  python app.py --face-shape square --age 25
"""

import argparse
import sys

from recommender import recommend_glasses


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Recommend glasses based on face shape and age."
    )
    parser.add_argument(
        "--face-shape",
        required=True,
        help="Face shape (oval, round, square, heart, oblong, diamond, triangle)",
    )
    parser.add_argument(
        "--age",
        type=int,
        required=True,
        help="Age of the individual (integer, 0-150)",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        recommendation = recommend_glasses(face_shape=args.face_shape, age=args.age)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    print(recommendation.summary())


if __name__ == "__main__":
    main()
