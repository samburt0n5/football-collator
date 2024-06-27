const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const calculateSeason = (date) => {
  const seasonStartAugust = new Date(new Date().getFullYear(),7,1)
  //e.g. needs to be 2324 for 2023/2024 season
  return (date < seasonStartAugust) ? (date.getFullYear() - 1).toString().slice(2) + date.getFullYear().toString().slice(2) : date.getFullYear().toString().slice(2) + (date.getFullYear() + 1).toString().slice(2)
}

const sendFixturesData = async(fixtures) => {
  console.log("Sending fixture data.")
  return axios.post('https://hgpkzpc3vb.execute-api.eu-west-2.amazonaws.com/dev/fixtures/bulkImport', fixtures)
    .then(function (response) {
      console.log(response);
      Promise.resolve()
    })
    .catch(function (error) {
      console.log(error);
    });
}

async function getFixturesForDate(date) {
  let fixtures = [];
  await fetchData(date.toISOString().split('T')[0]).then(fixtureList => {
    fixtureList.forEach(item => {
      fixtures.push(item);
    });
  });
  return fixtures
}

async function getFixturesForNDays(startDate, numberOfDays) {
  let fixtures = [];
  const previousDay = new Date();
  previousDay.setDate(startDate.getDate() -1);
  await getFixturesForDate(previousDay).then(fixtureList => { fixtureList.forEach(item => { fixtures.push(item) }) });
  for (let i = 0; i < numberOfDays; i++) {
    const nextDay = new Date();
    nextDay.setDate(startDate.getDate() + i);
    await getFixturesForDate(nextDay).then(fixtureList => { fixtureList.forEach(item => { fixtures.push(item) }) });
  }
  return fixtures;
}

exports.handler = async(event, context) => {
  const date = event.queryStringParameters.date
  const numberOfDays = event.queryStringParameters.numberOfDays
  const updateApi = (event.queryStringParameters.updateApi === "true");
  const startDate = new Date()
  let fixtures = date === "all" ? await getFixturesForNDays(startDate, Number(numberOfDays)) : await fetchData(date)
  console.log("Fixture count: " + fixtures.length)
  if(updateApi) { await sendFixturesData(fixtures) }
};

const fetchData = async(date) => {
  const today = new Date()
  const url = 'https://web-cdn.api.bbci.co.uk/wc-poll-data/container/sport-data-scores-fixtures?selectedEndDate='+ date +'&selectedStartDate='+ date +'&todayDate='+ today.toISOString().split('T')[0] +'&urn=urn:bbc:sportsdata:football:tournament-collection:collated&useSdApi=false';
  try {
    const response = await axios.get(url);
    const data = response.data;

    if (!data.eventGroups) {
      throw new Error("Missing 'eventGroups' property in the response");
    }

    return data.eventGroups.flatMap(eventGroup =>
      eventGroup.secondaryGroups?.flatMap(group =>
        group.events?.map(event => ({
          id: uuidv4(),
          dateTime: event.date.isoDate+'T'+event.time.displayTimeUK,
          club1: event.home?.fullName,
          club2: event.away?.fullName,
          club1Score: event.home?.score,
          club2Score: event.away?.score,
          competition: eventGroup.displayLabel,
          providerId: event.id,
          season: (Array("Premier League","Bundesliga","La Liga","Ligue 1").includes(eventGroup.displayLabel)) ? calculateSeason(new Date(event.date.isoDate)) : '',
          goals: [
            ...extractGoals(event.home?.actions || []).map(goal => ({ ...goal, teamId: 'A' })),
            ...extractGoals(event.away?.actions || []).map(goal => ({ ...goal, teamId: 'B' })),
          ],
        })) || []
      ) || []
    );
  } catch (error) {
    console.error(error);
  }
}

function extractGoals(actions) {
  return actions.filter(action => action.actions && action.actions.some(nestedAction => nestedAction.type === 'Goal')) // Filter actions with nested goals
    .flatMap(action => action.actions.filter(nestedAction => nestedAction.type === 'Goal') // Filter nested goals
      .map(goal => ({id:uuidv4(), playerName: action.playerName, clockTime: goal.timeLabel.value }))); // Create goal objects
}

// const date = new Date()
// fetchData(date.toISOString().split('T')[0]).then(data => console.log(data))