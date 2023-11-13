
import os
import argparse
import json
from itertools import groupby

def make_tree(rows, header_dict, depth):

    for root, children in groupby(rows, lambda x: x[0].split('.')[:depth]):  # TODO: check if depth or depth+1 or depth-1
        
        children = list(children)
        root, children = children[0], children[1:]

        field = {"name" : root[header_dict["name"]].split(".")[-1], "type" : root[header_dict["type"]], "mode" : root[header_dict["mode"]], "description" : root[header_dict["description"]]}

        if len(children) == 0:
            # no nested fields
            ...
        else:
            # nested fields
            field["fields"] = list(make_tree(children, header_dict, depth+1))

        yield field


def convert_file(input_file, output_file):

    # read input
    with open(input_file, 'rt') as rr:
        rows = rr.readlines()

    # get header and parse lines
    header, rows = rows[0], rows[1:]
    header = header.strip("\n").split('\t')

    # get indices corresponding to header
    header_dict = {h: i for i, h in enumerate(header)}

    rows = [row.strip("\n").split('\t') for row in rows]

    # sort rows by name
    rows = sorted(rows, key=lambda x: x[header_dict['name']])

    tree = list(make_tree(rows, header_dict, depth=1))

    # write output
    with open(output_file, 'wt') as ww:
        json.dump(tree, ww, indent=4)


if __name__ == "__main__":
    # Initialize the argument parser
    parser = argparse.ArgumentParser(description="Convert a TSV file to a JSON schema file")
    parser.add_argument("input_fold", help="The folder containing the input TSV files")
    parser.add_argument("output_fold", help="The path to the output folder for the JSON schema files")
    args = parser.parse_args()

    # Get the list of input files
    input_files = [os.path.join(args.input_fold, f) for f in os.listdir(args.input_fold) if f.endswith(".tsv")]

    # Create the output folder if it does not exist
    if not os.path.exists(args.output_fold):
        os.makedirs(args.output_fold)

    # Loop over the input files
    for input_file in input_files:
        # Get the name of the output file
        output_file = os.path.join(args.output_fold, os.path.basename(input_file).replace(".tsv", ".json"))

        # Call the conversion function with the input and output file paths
        if not os.path.exists(output_file):
            convert_file(input_file, output_file)
        else:
            print(f"File {output_file} already exists, skipping...")
            

