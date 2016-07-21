var mongoose = require('mongoose');
exports.doorSchema = mongoose.Schema({ //Data schema with all possible data types
    inventory: { type: String, index: true },
    manufacturer: { type: String, index: true },
    name: String,
    pageUrl: String,
    imageUrl: String,
    size: String,
    type: String,
    style: String, 
    woodSpecies: { type: String, index: true },
    core: { type: String, index: true },
    construction: String,
    glassType: String,
    glassStyle: String,
    glassThickness: String,
    finished: String,
    paintable: String,
    stainable: String,
    fireRating: String,
    hurricaneRated: String,
    FSCCertified: String,
    warranty: String,
    handing: String,
    floridaApproved: String,
    doorMaterial: String,
    doorThickness: String,
    glassTextureOptions: String,
    impactRated: String,
    energyStarCertified: String,
    glassTextureCombination: String,
    glassPrivacyRating: String,
    outsideJambDimensions: String,
    RoughOpeningDimensions: String,
    panels: String
});