// Source rectangles measured against original PNG alpha; images are not rewritten.
export const ATLASES = {
  "ground": {
    "file": "ground-v1.png",
    "width": 1254,
    "height": 1254
  },
  "nature": {
    "file": "nature-v1.png",
    "width": 1254,
    "height": 1254
  },
  "buildings": {
    "file": "buildings-v1.png",
    "width": 1374,
    "height": 1145
  },
  "furniture": {
    "file": "furniture-v1.png",
    "width": 1254,
    "height": 1254
  },
  "camp": {
    "file": "camp-v1.png",
    "width": 1254,
    "height": 1254
  },
  "actors": {
    "file": "actors-v1.png",
    "width": 1122,
    "height": 1402
  },
  "states": {
    "file": "states-v1.png",
    "width": 1254,
    "height": 1254
  },
  "sample": {
    "file": "sample-v1.png",
    "width": 1254,
    "height": 1254
  }
};
export const SPRITES = {
  "grass": {
    "atlas": "ground",
    "rect": [
      0.0,
      0.0,
      313.5,
      313.5
    ]
  },
  "forestEarth": {
    "atlas": "ground",
    "rect": [
      313.5,
      0.0,
      313.5,
      313.5
    ]
  },
  "gravel": {
    "atlas": "ground",
    "rect": [
      627.0,
      0.0,
      313.5,
      313.5
    ]
  },
  "snow": {
    "atlas": "ground",
    "rect": [
      940.5,
      0.0,
      313.5,
      313.5
    ]
  },
  "mud": {
    "atlas": "ground",
    "rect": [
      0.0,
      313.5,
      313.5,
      313.5
    ]
  },
  "sand": {
    "atlas": "ground",
    "rect": [
      313.5,
      313.5,
      313.5,
      313.5
    ]
  },
  "marsh": {
    "atlas": "ground",
    "rect": [
      627.0,
      313.5,
      313.5,
      313.5
    ]
  },
  "coldgrass": {
    "atlas": "ground",
    "rect": [
      940.5,
      313.5,
      313.5,
      313.5
    ]
  },
  "farmland": {
    "atlas": "ground",
    "rect": [
      0.0,
      627.0,
      313.5,
      313.5
    ]
  },
  "asphalt": {
    "atlas": "ground",
    "rect": [
      313.5,
      627.0,
      313.5,
      313.5
    ]
  },
  "cobble": {
    "atlas": "ground",
    "rect": [
      627.0,
      627.0,
      313.5,
      313.5
    ]
  },
  "dirt": {
    "atlas": "ground",
    "rect": [
      940.5,
      627.0,
      313.5,
      313.5
    ]
  },
  "shallow": {
    "atlas": "ground",
    "rect": [
      0.0,
      940.5,
      313.5,
      313.5
    ]
  },
  "deep": {
    "atlas": "ground",
    "rect": [
      313.5,
      940.5,
      313.5,
      313.5
    ]
  },
  "wood": {
    "atlas": "ground",
    "rect": [
      627.0,
      940.5,
      313.5,
      313.5
    ]
  },
  "brick": {
    "atlas": "ground",
    "rect": [
      940.5,
      940.5,
      313.5,
      313.5
    ]
  },
  "broadleaf": {
    "atlas": "nature",
    "rect": [
      0,
      13,
      334,
      341
    ]
  },
  "pine": {
    "atlas": "nature",
    "rect": [
      334,
      15,
      294,
      339
    ]
  },
  "snowpine": {
    "atlas": "nature",
    "rect": [
      642,
      13,
      298,
      341
    ]
  },
  "jungle": {
    "atlas": "nature",
    "rect": [
      940,
      15,
      303,
      339
    ]
  },
  "berries": {
    "atlas": "nature",
    "rect": [
      0,
      354,
      334,
      276
    ]
  },
  "berriesEmpty": {
    "atlas": "nature",
    "rect": [
      334,
      354,
      293,
      276
    ]
  },
  "herb": {
    "atlas": "nature",
    "rect": [
      627,
      354,
      293,
      276
    ]
  },
  "vegetables": {
    "atlas": "nature",
    "rect": [
      920,
      354,
      322,
      276
    ]
  },
  "grain": {
    "atlas": "nature",
    "rect": [
      0,
      630,
      340,
      314
    ]
  },
  "reeds": {
    "atlas": "nature",
    "rect": [
      340,
      630,
      297,
      314
    ]
  },
  "shrub": {
    "atlas": "nature",
    "rect": [
      637,
      630,
      303,
      314
    ]
  },
  "log": {
    "atlas": "nature",
    "rect": [
      940,
      630,
      313,
      314
    ]
  },
  "stones": {
    "atlas": "nature",
    "rect": [
      0,
      944,
      293,
      310
    ]
  },
  "boulder": {
    "atlas": "nature",
    "rect": [
      293,
      944,
      334,
      310
    ]
  },
  "cave": {
    "atlas": "nature",
    "rect": [
      627,
      944,
      313,
      310
    ]
  },
  "hill": {
    "atlas": "nature",
    "rect": [
      940,
      944,
      302,
      310
    ]
  },
  "cabin": {
    "atlas": "buildings",
    "rect": [
      41,
      51,
      301,
      239
    ]
  },
  "farmhouse": {
    "atlas": "buildings",
    "rect": [
      368,
      26,
      297,
      258
    ]
  },
  "shop": {
    "atlas": "buildings",
    "rect": [
      708,
      19,
      306,
      263
    ]
  },
  "warehouse": {
    "atlas": "buildings",
    "rect": [
      1014,
      30,
      340,
      269
    ]
  },
  "clinic": {
    "atlas": "buildings",
    "rect": [
      44,
      307,
      296,
      277
    ]
  },
  "factory": {
    "atlas": "buildings",
    "rect": [
      350,
      300,
      337,
      306
    ]
  },
  "ruins": {
    "atlas": "buildings",
    "rect": [
      700,
      305,
      329,
      299
    ]
  },
  "apartment": {
    "atlas": "buildings",
    "rect": [
      1029,
      318,
      299,
      267
    ]
  },
  "barn": {
    "atlas": "buildings",
    "rect": [
      0,
      619,
      333,
      261
    ]
  },
  "greenhouse": {
    "atlas": "buildings",
    "rect": [
      343,
      614,
      344,
      265
    ]
  },
  "ranger": {
    "atlas": "buildings",
    "rect": [
      687,
      612,
      319,
      266
    ]
  },
  "garage": {
    "atlas": "buildings",
    "rect": [
      1060,
      620,
      298,
      260
    ]
  },
  "tent": {
    "atlas": "buildings",
    "rect": [
      23,
      893,
      312,
      206
    ]
  },
  "well": {
    "atlas": "buildings",
    "rect": [
      353,
      882,
      334,
      220
    ]
  },
  "woodbridge": {
    "atlas": "buildings",
    "rect": [
      687,
      880,
      329,
      246
    ]
  },
  "stonebridge": {
    "atlas": "buildings",
    "rect": [
      1016,
      880,
      318,
      225
    ]
  },
  "crateClosed": {
    "atlas": "furniture",
    "rect": [
      0,
      51,
      308,
      228
    ]
  },
  "crateOpen": {
    "atlas": "furniture",
    "rect": [
      350,
      27,
      242,
      252
    ]
  },
  "crateEmpty": {
    "atlas": "furniture",
    "rect": [
      630,
      23,
      305,
      295
    ]
  },
  "cabinetClosed": {
    "atlas": "furniture",
    "rect": [
      951,
      19,
      279,
      299
    ]
  },
  "cabinetOpen": {
    "atlas": "furniture",
    "rect": [
      0,
      330,
      313,
      269
    ]
  },
  "cabinetEmpty": {
    "atlas": "furniture",
    "rect": [
      313,
      333,
      314,
      289
    ]
  },
  "shelfFull": {
    "atlas": "furniture",
    "rect": [
      656,
      318,
      276,
      301
    ]
  },
  "shelfEmpty": {
    "atlas": "furniture",
    "rect": [
      932,
      318,
      302,
      304
    ]
  },
  "bed": {
    "atlas": "furniture",
    "rect": [
      0,
      628,
      304,
      274
    ]
  },
  "table": {
    "atlas": "furniture",
    "rect": [
      333,
      622,
      280,
      272
    ]
  },
  "chair": {
    "atlas": "furniture",
    "rect": [
      705,
      640,
      233,
      262
    ]
  },
  "armchair": {
    "atlas": "furniture",
    "rect": [
      938,
      622,
      300,
      266
    ]
  },
  "bookshelf": {
    "atlas": "furniture",
    "rect": [
      0,
      921,
      293,
      333
    ]
  },
  "radio": {
    "atlas": "furniture",
    "rect": [
      343,
      946,
      280,
      286
    ]
  },
  "cellar": {
    "atlas": "furniture",
    "rect": [
      656,
      919,
      260,
      291
    ]
  },
  "metalbench": {
    "atlas": "furniture",
    "rect": [
      945,
      913,
      289,
      296
    ]
  },
  "bench": {
    "atlas": "camp",
    "rect": [
      0,
      39,
      314,
      294
    ]
  },
  "stove": {
    "atlas": "camp",
    "rect": [
      314,
      39,
      313,
      294
    ]
  },
  "smoker": {
    "atlas": "camp",
    "rect": [
      627,
      14,
      318,
      319
    ]
  },
  "heater": {
    "atlas": "camp",
    "rect": [
      945,
      11,
      287,
      321
    ]
  },
  "rainCollector": {
    "atlas": "camp",
    "rect": [
      29,
      333,
      277,
      305
    ]
  },
  "purifier": {
    "atlas": "camp",
    "rect": [
      343,
      333,
      284,
      300
    ]
  },
  "planter": {
    "atlas": "camp",
    "rect": [
      640,
      333,
      280,
      305
    ]
  },
  "garden": {
    "atlas": "camp",
    "rect": [
      945,
      337,
      295,
      277
    ]
  },
  "fireUnlit": {
    "atlas": "camp",
    "rect": [
      0,
      638,
      322,
      274
    ]
  },
  "fireLit": {
    "atlas": "camp",
    "rect": [
      322,
      639,
      305,
      281
    ]
  },
  "fireAsh": {
    "atlas": "camp",
    "rect": [
      627,
      638,
      297,
      282
    ]
  },
  "roof": {
    "atlas": "camp",
    "rect": [
      940,
      642,
      310,
      278
    ]
  },
  "snare": {
    "atlas": "camp",
    "rect": [
      0,
      920,
      289,
      280
    ]
  },
  "snareSpent": {
    "atlas": "camp",
    "rect": [
      320,
      920,
      307,
      334
    ]
  },
  "fishbasket": {
    "atlas": "camp",
    "rect": [
      634,
      920,
      301,
      298
    ]
  },
  "fishbasketSpent": {
    "atlas": "camp",
    "rect": [
      940,
      920,
      302,
      312
    ]
  },
  "rabbit": {
    "atlas": "actors",
    "rect": [
      0,
      69,
      259,
      255
    ]
  },
  "deer": {
    "atlas": "actors",
    "rect": [
      272,
      12,
      289,
      333
    ]
  },
  "boar": {
    "atlas": "actors",
    "rect": [
      588,
      37,
      246,
      308
    ]
  },
  "fox": {
    "atlas": "actors",
    "rect": [
      839,
      21,
      271,
      324
    ]
  },
  "wolf": {
    "atlas": "actors",
    "rect": [
      45,
      372,
      220,
      242
    ]
  },
  "rat": {
    "atlas": "actors",
    "rect": [
      285,
      345,
      274,
      231
    ]
  },
  "bat": {
    "atlas": "actors",
    "rect": [
      566,
      345,
      284,
      267
    ]
  },
  "player": {
    "atlas": "actors",
    "rect": [
      856,
      345,
      248,
      262
    ]
  },
  "rabbitDead": {
    "atlas": "actors",
    "rect": [
      23,
      673,
      233,
      159
    ]
  },
  "deerDead": {
    "atlas": "actors",
    "rect": [
      256,
      627,
      297,
      183
    ]
  },
  "boarDead": {
    "atlas": "actors",
    "rect": [
      570,
      646,
      272,
      163
    ]
  },
  "foxDead": {
    "atlas": "actors",
    "rect": [
      858,
      650,
      250,
      148
    ]
  },
  "wolfDead": {
    "atlas": "actors",
    "rect": [
      27,
      859,
      253,
      178
    ]
  },
  "ratDead": {
    "atlas": "actors",
    "rect": [
      321,
      875,
      210,
      150
    ]
  },
  "batDead": {
    "atlas": "actors",
    "rect": [
      610,
      845,
      186,
      170
    ]
  },
  "humanDead": {
    "atlas": "actors",
    "rect": [
      858,
      845,
      254,
      192
    ]
  },
  "survivor": {
    "atlas": "actors",
    "rect": [
      0,
      1037,
      275,
      323
    ]
  },
  "trader": {
    "atlas": "actors",
    "rect": [
      281,
      1037,
      260,
      327
    ]
  },
  "wounded": {
    "atlas": "actors",
    "rect": [
      558,
      1044,
      288,
      358
    ]
  },
  "raider": {
    "atlas": "actors",
    "rect": [
      862,
      1046,
      212,
      318
    ]
  },
  "vegetablesSeedling": {
    "atlas": "states",
    "rect": [
      0,
      2,
      340,
      308
    ]
  },
  "vegetablesGrowing": {
    "atlas": "states",
    "rect": [
      340,
      10,
      291,
      300
    ]
  },
  "vegetablesRipe": {
    "atlas": "states",
    "rect": [
      631,
      7,
      309,
      303
    ]
  },
  "vegetablesDead": {
    "atlas": "states",
    "rect": [
      940,
      17,
      298,
      293
    ]
  },
  "grainSeedling": {
    "atlas": "states",
    "rect": [
      0,
      310,
      340,
      323
    ]
  },
  "grainGrowing": {
    "atlas": "states",
    "rect": [
      340,
      310,
      287,
      323
    ]
  },
  "grainRipe": {
    "atlas": "states",
    "rect": [
      627,
      310,
      295,
      323
    ]
  },
  "grainDead": {
    "atlas": "states",
    "rect": [
      922,
      310,
      314,
      323
    ]
  },
  "herbSeedling": {
    "atlas": "states",
    "rect": [
      0,
      640,
      334,
      325
    ]
  },
  "herbGrowing": {
    "atlas": "states",
    "rect": [
      334,
      633,
      287,
      332
    ]
  },
  "herbRipe": {
    "atlas": "states",
    "rect": [
      621,
      633,
      293,
      332
    ]
  },
  "herbDead": {
    "atlas": "states",
    "rect": [
      914,
      633,
      318,
      332
    ]
  },
  "stump": {
    "atlas": "states",
    "rect": [
      11,
      965,
      298,
      269
    ]
  },
  "stonesEmpty": {
    "atlas": "states",
    "rect": [
      309,
      965,
      320,
      259
    ]
  },
  "herbEmpty": {
    "atlas": "states",
    "rect": [
      629,
      965,
      338,
      289
    ]
  },
  "reedsEmpty": {
    "atlas": "states",
    "rect": [
      967,
      966,
      277,
      274
    ]
  },
  "sampleGrass": {
    "atlas": "sample",
    "rect": [
      47,
      17,
      262,
      308
    ]
  },
  "sampleSoil": {
    "atlas": "sample",
    "rect": [
      309,
      33,
      316,
      292
    ]
  },
  "sampleGravel": {
    "atlas": "sample",
    "rect": [
      656,
      15,
      284,
      310
    ]
  },
  "sampleSnow": {
    "atlas": "sample",
    "rect": [
      940,
      15,
      294,
      310
    ]
  },
  "treeVariant1": {
    "atlas": "sample",
    "rect": [
      0,
      325,
      338,
      320
    ]
  },
  "treeVariant2": {
    "atlas": "sample",
    "rect": [
      338,
      325,
      289,
      321
    ]
  },
  "pineVariant": {
    "atlas": "sample",
    "rect": [
      627,
      325,
      287,
      321
    ]
  },
  "snowpineVariant": {
    "atlas": "sample",
    "rect": [
      914,
      325,
      324,
      321
    ]
  },
  "sampleBerry": {
    "atlas": "sample",
    "rect": [
      0,
      649,
      320,
      272
    ]
  },
  "sampleLog": {
    "atlas": "sample",
    "rect": [
      320,
      646,
      321,
      275
    ]
  },
  "sampleStones": {
    "atlas": "sample",
    "rect": [
      641,
      646,
      289,
      275
    ]
  },
  "sampleRock": {
    "atlas": "sample",
    "rect": [
      930,
      646,
      294,
      275
    ]
  },
  "sampleHill": {
    "atlas": "sample",
    "rect": [
      0,
      921,
      313,
      333
    ]
  },
  "ridge": {
    "atlas": "sample",
    "rect": [
      313,
      921,
      314,
      285
    ]
  },
  "snowridge": {
    "atlas": "sample",
    "rect": [
      630,
      921,
      327,
      333
    ]
  },
  "sampleReeds": {
    "atlas": "sample",
    "rect": [
      957,
      921,
      281,
      333
    ]
  }
};
