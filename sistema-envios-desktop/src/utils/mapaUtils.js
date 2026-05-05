function osmTileUrl() {
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}

function osmAttribution() {
  return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
}

module.exports = { osmTileUrl, osmAttribution };

