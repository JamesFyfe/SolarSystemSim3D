import json
import math

# Initialize an empty list to store the moon data
moon_data = [[], [], [], [], [], [], [], [], []]

# Open the input file
with open('./moons.txt', 'r') as file:
    # Read the file line by line
    for line in file:
        # Split the line into columns
        cols = line.strip().split()

        # Extract the relevant data
        name = cols[1]
        planetId = int(cols[2][0]) - 1
        bodyId = '0-'
        bodyId = bodyId + str(planetId) + '-'
        bodyId = bodyId + str(int(cols[2][1:]) - 1)
        radius = float(cols[6]) / 1000
        density = float(cols[9])
        mass = (4/3 * math.pi * math.pow(radius, 3) * density) * math.pow(10, -3)

        # Add the moon data to the list
        moon_data[planetId].append({
            'bodyId': bodyId,
            'name': name,
            'mass': mass,
            'radius': radius,
            'color': 'rgb(100, 100, 100)',
            'texturePath': '/images/' + name.lower() + '_texture.jpeg', 
            'startingPosition': { 'x': 0, 'y': 0, 'z': 0 },
            'rotationPeriod': 100,
            'axisTilt' : 0

        })

# Open the orbital data file
with open('moon_orbits.txt', 'r') as orbit_file:
    # Read the file line by line
    for line in orbit_file:
        # Split the line into columns
        cols = line.strip().split()

        # Extract the name and orbital data
        name = cols[1]
        frame = cols[4].lower()
        planetId = int(cols[2][0]) - 1
        bodyId = '0-'
        bodyId = bodyId + str(planetId) + '-'
        bodyId = bodyId + str(int(cols[2][1:]) - 1)
        a = float(cols[6]) / 1000
        e = float(cols[7])
        w = float(cols[8])
        l0 = float(cols[9])
        i = float(cols[10])
        node = float(cols[11])
        Ldot = 36525 * 360 / float(cols[12])

        # Find the corresponding moon in the moon_data list
        for planet in moon_data:
            for moon in planet:
                if moon['bodyId'] == bodyId:
                    # Add the orbital data to the moon dictionary
                    moon['orbitData'] = {
                        'frame': frame,
                        'L0': l0,
                        'Ldot': Ldot,
                        'semiMajorAxis': a, 
                        'eccentricity': e, 
                        'argumentOfPeriapsis': w,
                        'inclination': i, 
                        'longitudeOfAscendingNode' : node
                        }
                    break

        



# Save the moon data as a JSON file
with open('moon_data.json', 'w') as f:
    json.dump(moon_data, f, indent=2)