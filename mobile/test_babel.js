const fs = require('fs');
const babel = require('@babel/core');
try {
  babel.transformFileSync('./src/screens/volunteer/VolunteerProfileScreen.js', {
    presets: ['babel-preset-expo']
  });
  console.log("SUCCESS");
} catch (e) {
  console.error(e);
}
