import struct
import json

def read_catalog(file_path):
    with open(file_path, 'rb') as file:
        header = file.read(28)
        star0, star1, starn, stnum, mprop, nmag, nbent = struct.unpack('7i', header)

        if starn < 0:
            starn = -starn

        stars = []
        for _ in range(starn):
            entry = file.read(nbent)
            star = {}

            if stnum == 0:
                pass
            elif stnum in [1, 2, 3]:
                star['catalog_number'] = struct.unpack('f', entry[:4])[0]
                entry = entry[4:]
            elif stnum == 4:
                star['catalog_number'] = struct.unpack('i', entry[:4])[0]
                entry = entry[4:]
            elif stnum < 0:
                star['object_name'] = entry[-stnum:].decode('ascii').strip()
                entry = entry[:-stnum]

            star['ra'] = struct.unpack('d', entry[:8])[0]
            star['dec'] = struct.unpack('d', entry[8:16])[0]
            star['spectral_type'] = entry[16:18].decode('ascii').strip()

            magnitude = struct.unpack('h', entry[18:20])[0] / 100
            star['magnitude'] = magnitude

            stars.append(star)

        return stars

# Usage example
catalog = read_catalog('./BSC5')
json_output = json.dumps(catalog, indent=2)
print(json_output)

with open('../src/data/StarData.json', 'w') as f:
    json.dump(catalog, f, indent=2)