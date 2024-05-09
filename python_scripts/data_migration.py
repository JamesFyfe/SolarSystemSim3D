import json
modified_data = []
sunIndex = planetIndex = 0

def addDataIfExists(data, new_data, name):
    param = data.get(name)
    if param or param == 0.0:
        new_data[name] = param

def migrateData(data):
    new_data = {
        "id": data["id"],
        "name": data["name"],
        "clickable": data["clickable"],
        "physicalData": {
            "mass": data["mass"],
            "radius": data["radius"],
            "color": data["color"],
            "textureName": data["textureName"],
            "axisTilt": data["axisTilt"],
            "rotationPeriod": data["rotationPeriod"],
            "startingRotation": data.get("startingRotation", "0"),
        },
    }
    orbitData = data.get("orbitData")
    if orbitData:
        new_data["orbitData"] = {
            "semiMajorAxis": orbitData["semiMajorAxis"],
            "eccentricity": orbitData["eccentricity"],
            "inclination": orbitData["inclination"],
            "meanAnomaly": orbitData["meanAnomaly"],
            "meanAnomalyPerCentury": orbitData["meanAnomalyPerCentury"],
            "longitudeOfAscendingNode": orbitData["longitudeOfAscendingNode"],
        }
        addDataIfExists(orbitData, new_data["orbitData"], "longitudeOfPeriapsis")
        addDataIfExists(orbitData, new_data["orbitData"], "argumentOfPeriapsis")
        addDataIfExists(orbitData, new_data["orbitData"], "frame")
    addDataIfExists(data, new_data, "atmosphere")
    addDataIfExists(data, new_data, "ringData")
    if data.get("children"):
        new_data["children"] = []
    return new_data

with open('../src/data/OldPlanetData.json') as f:
    data = json.load(f)
    for sun in data:
        modified_data.append(migrateData(sun))
        for planet in sun['children']:
            modified_data[sunIndex]["children"].append(migrateData(planet))
            print(planetIndex, planet, "\n\n")
            if planet.get("children"):
                for moon in planet['children']:
                    print(planetIndex)
                    modified_data[sunIndex]["children"][planetIndex]["children"].append(migrateData(moon))
            planetIndex += 1
        sunIndex += 1

# print(modified_data)

# Save the data as a JSON file
with open('../src/data/PlanetData.json', 'w') as f:
  	json.dump(modified_data, f, indent=2)
