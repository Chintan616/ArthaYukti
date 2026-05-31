const mongoose = require('mongoose');
const schema = new mongoose.Schema({ content: { type: String, required: true } });
const Model = mongoose.model('Test', schema);
const doc = new Model({ content: "" });
const err = doc.validateSync();
console.log(err ? err.message : 'Validation passed');
