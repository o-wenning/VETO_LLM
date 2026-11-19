
import json
import argparse


def adjust_offset(text, offset):
    if offset is None:
        return None

    removed = text[:offset].count("\\t")
    return offset - removed


def fix_annotations(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    total_replacements = 0
    total_annotations = 0

    for obj in json_data["data"]:
        original_text = obj.get("text", "")

        # Count escaped newline sequences
        replacements = original_text.count("\\t")
        total_replacements += replacements

        # Process annotation dictionary
        attributes = obj.get("attributes", {})

        for attribute_type, attribute_data in attributes.items():

            # Handle multiple annotations (e.g. DATE)
            if isinstance(attribute_data, list):
                annotations = attribute_data

            # Handle single annotation (e.g. AGE)
            elif isinstance(attribute_data, dict):
                annotations = [attribute_data]

            else:
                continue

            for annotation in annotations:
                if not isinstance(annotation, dict):
                    continue

                if annotation.get("start") is not None:
                    annotation["start"] = adjust_offset(
                        original_text, annotation["start"]
                    )

                if annotation.get("end") is not None:
                    annotation["end"] = adjust_offset(
                        original_text, annotation["end"]
                    )

                total_annotations += 1

        # Replace escaped newlines with actual newlines
        obj["text"] = original_text.replace("\\t", "\t")

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(
            json_data,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"Done! Processed {len(json_data['data'])} objects.")
    print(f"Total newline replacements: {total_replacements}")
    print(f"Total annotations processed: {total_annotations}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fix escaped newlines and annotation offsets in JSON."
    )

    parser.add_argument("input", help="Input JSON file")

    parser.add_argument(
        "-o", "--output",
        default="fixed.json",
        help="Output JSON file (default: fixed.json)"
    )

    args = parser.parse_args()

    fix_annotations(args.input, args.output)
