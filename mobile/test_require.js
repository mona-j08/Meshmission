require('@babel/register')({
  presets: ['babel-preset-expo']
});
try {
  require('./src/screens/volunteer/VolunteerProfileScreen.js');
  console.log('SUCCESS');
} catch (e) {
  console.error('ERROR:', e);
}
