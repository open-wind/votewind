
var url_tileserver_style_json = 'http://localhost:8080/styles/votewind/style.json';
var openwind_structure = {
    "tipheight": "80",
    "bladeradius": "47.8",
    "configuration": "",
    "datasets": [
        {
            "title": "All constraint layers",
            "color": "darkgrey",
            "dataset": "latest--windconstraints",
            "level": 1,
            "children": [],
            "defaultactive": false,
            "height-to-tip": "80",
            "blade-radius": "47.8",
            "configuration": ""
        },
        {
            "title": "Aviation and exclusion areas",
            "color": "purple",
            "dataset": "latest--aviation-and-exclusion-areas",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8",
            "children": [
                {
                    "title": "Airspace",
                    "color": "purple",
                    "dataset": "latest--airspace",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Civilian airports",
                    "color": "purple",
                    "dataset": "latest--civilian-airports",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Explosive safeguarded areas, danger areas near ranges",
                    "color": "purple",
                    "dataset": "latest--danger-areas",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "MOD training areas",
                    "color": "purple",
                    "dataset": "latest--mod-training-areas",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                }
            ]
        },
        {
            "title": "Ecology and wildlife",
            "color": "darkgreen",
            "dataset": "latest--ecology-and-wildlife",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8",
            "children": [
                {
                    "title": "Ancient woodlands",
                    "color": "darkgreen",
                    "dataset": "latest--ancient-woodlands",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Sites of Special Scientific Interest",
                    "color": "darkgreen",
                    "dataset": "latest--sites-of-special-scientific-interest",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Hedgerows",
                    "color": "darkgreen",
                    "dataset": "latest--hedgerows",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Local Nature Reserves",
                    "color": "darkgreen",
                    "dataset": "latest--local-nature-reserves",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "National Nature Reserves",
                    "color": "darkgreen",
                    "dataset": "latest--national-nature-reserves",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "OSM Nature Reserves",
                    "color": "darkgreen",
                    "dataset": "latest--osm-nature-reserves",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Ramsar sites",
                    "color": "darkgreen",
                    "dataset": "latest--ramsar-sites",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Special Areas of Conservation",
                    "color": "darkgreen",
                    "dataset": "latest--special-areas-of-conservation",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Special Protection Areas",
                    "color": "darkgreen",
                    "dataset": "latest--special-protection-areas",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Wild Land Areas",
                    "color": "darkgreen",
                    "dataset": "latest--wild-land-areas",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                }
            ]
        },
        {
            "title": "Inadequate wind speeds",
            "color": "blue",
            "dataset": "latest--inadequate-wind-speeds",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8"
        },
        {
            "title": "Heritage impacts",
            "color": "darkgoldenrod",
            "dataset": "latest--heritage-impacts",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8",
            "children": [
                {
                    "title": "Conservation Areas",
                    "color": "darkgoldenrod",
                    "dataset": "latest--conservation-areas",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Listed buildings",
                    "color": "darkgoldenrod",
                    "dataset": "latest--listed-buildings",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Registered historic battlefields",
                    "color": "darkgoldenrod",
                    "dataset": "latest--registered-historic-battlefields",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Registered parks and gardens",
                    "color": "darkgoldenrod",
                    "dataset": "latest--registered-parks-and-gardens",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Scheduled Ancient Monuments",
                    "color": "darkgoldenrod",
                    "dataset": "latest--scheduled-ancient-monuments",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "World Heritage Sites",
                    "color": "darkgoldenrod",
                    "dataset": "latest--world-heritage-sites",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                }
            ]
        },
        {
            "title": "Landscape and visual impacts",
            "color": "chartreuse",
            "dataset": "latest--landscape-and-visual-impacts",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8",
            "children": [
                {
                    "title": "Areas of Outstanding Natural Beauty",
                    "color": "chartreuse",
                    "dataset": "latest--areas-of-outstanding-natural-beauty",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Heritage Coasts",
                    "color": "chartreuse",
                    "dataset": "latest--heritage-coasts",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "National Parks",
                    "color": "chartreuse",
                    "dataset": "latest--national-parks",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                }
            ]
        },
        {
            "title": "Other technical constraints",
            "color": "red",
            "dataset": "latest--other-technical-constraints",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8",
            "children": [
                {
                    "title": "Bridleways",
                    "color": "red",
                    "dataset": "latest--bridleways",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Inland waters",
                    "color": "red",
                    "dataset": "latest--inland-waters",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Pipelines",
                    "color": "red",
                    "dataset": "latest--pipelines",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Power lines",
                    "color": "red",
                    "dataset": "latest--power-lines",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Public footpaths",
                    "color": "red",
                    "dataset": "latest--public-footpaths",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Public roads (A and B roads and motorways)",
                    "color": "red",
                    "dataset": "latest--public-roads-a-b-motorways",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                },
                {
                    "title": "Railway lines",
                    "color": "red",
                    "dataset": "latest--railway-lines",
                    "level": 2,
                    "defaultactive": false,
                    "height-to-tip": "80",
                    "blade-radius": "47.8"
                }
            ]
        },
        {
            "title": "Residential buildings",
            "color": "darkorange",
            "dataset": "latest--residential-buildings",
            "level": 1,
            "defaultactive": true,
            "height-to-tip": "80",
            "blade-radius": "47.8"
        }
    ]
};