import json
import math

# Initialize an empty list to store the moon data
moon_data = [[], [], [], [], [], [], [], [], []]
with open('./clickable_moons.json') as f:
    clickable_moons = json.load(f)

# Open the input file
with open('./moons.txt', 'r') as file:
    count = 0
    oldPlanetId = 0
    # Read the file line by line
    for line in file:
        # Split the line into columns
        cols = line.strip().split()

        # Extract the relevant data
        name = cols[1]
        planetId = int(cols[2][0]) - 1
        if(planetId != oldPlanetId):
            oldPlanetId = planetId
            count = 0
        id = '0-'
        id = id + str(planetId) + '-'
        id = id + str(count)
        radius = float(cols[6]) / 1000
        density = float(cols[9])
        mass = (4/3 * math.pi * math.pow(radius, 3) * density) * math.pow(10, -3)
        clickable = False
        textureName = None
        if(name in clickable_moons):
            textureName = '' + name.lower() + '_texture.jpeg'
            clickable = True

        # Add the moon data to the list
        moon_data[planetId].append({
            'id': id,
            'name': name,
            'mass': mass,
            'radius': radius,
            'color': 'rgb(175, 175, 175)',
            'textureName': textureName, 
            'startingPosition': { 'x': 0, 'y': 0, 'z': 0 },
            'axisTilt': 0,
            'clickable': clickable
        })
        count += 1

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
        id = '0-'
        id = id + str(planetId) + '-'
        id = id + str(int(cols[2][1:]) - 1)
        a = float(cols[6]) / 1000
        e = float(cols[7])
        w = float(cols[8])
        meanAnomaly = float(cols[9])
        i = float(cols[10])
        node = float(cols[11])
        meanAnomalyPerCentury = 36525 * 360 / float(cols[12])

        rotationPeriod = float(cols[12]) * 24

        # Find the corresponding moon in the moon_data list
        for planet in moon_data:
            for moon in planet:
                if moon['id'] == id:
                    moon['rotationPeriod'] = rotationPeriod
                    # Add the orbital data to the moon dictionary
                    moon['orbitData'] = {
                        'frame': frame,
                        'meanAnomaly': meanAnomaly,
                        'meanAnomalyPerCentury': meanAnomalyPerCentury,
                        'semiMajorAxis': a, 
                        'eccentricity': e, 
                        'argumentOfPeriapsis': w,
                        'inclination': i, 
                        'longitudeOfAscendingNode' : node
                        }
                    break

# # Save the moon data as a JSON file
# with open('moon_data.json', 'w') as f:
#     json.dump(moon_data, f, indent=2)

with open('./PlanetData.json') as f:
    data = json.load(f)
    # for planet in data[0]:
    #     planet['children']
    for i in range(9):
        data[0]['children'][i]['children'] = moon_data[i]

# Save the moon data as a JSON file
with open('../src/data/PlanetData.json', 'w') as f:
    json.dump(data, f, indent=2)