const axios = require('axios');
const cheerio = require('cheerio');

function findParentOrSiblingWithSelector($, element, selector) {
  let parent = $(element).parent();
  if (parent.is(selector)) {
    return parent;
  }

  let sibling = parent.prev();
  if (sibling.is(selector)) {
    return sibling;
  }

  while (parent.length && !parent.is(selector)) {
    parent = parent.parent();
    if (parent.is(selector)) {
      return parent;
    }

    sibling = parent.prev();
    if (sibling.is(selector)) {
      return sibling;
    }
  }

  return null;
}

const getScoresData = async(date) => {
  console.log("Getting scores data")
  axios.get('https://www.bbc.com/sport/football/scores-fixtures/'+date)
    .then(response => {
      const html = response.data;
      const $ = cheerio.load(html);
      const teamHomeDivs = $('.ssrcss-bon2fo-WithInlineFallback-TeamHome.e1efi6g53');
      const teamAwayDivs = $('.ssrcss-nvj22c-WithInlineFallback-TeamAway.e1efi6g52');

      let fixtures = [];

      teamHomeDivs.each((i, elem) => {
        const team1 = $(elem).find('span:first').text().trim();
        const team2 = $(teamAwayDivs[i]).find('span:first').text().trim();
        const dateElement = findParentOrSiblingWithSelector($, elem, 'div:has(h2.ssrcss-51z0b8-PrimaryHeading.ejnn8gi2)');
        const date = dateElement.find('h2.ssrcss-51z0b8-PrimaryHeading.ejnn8gi2').text().trim();
        fixtures.push({date, team1, team2});
      });

      console.log(fixtures);
    })
    .catch(console.error);

}

getScoresData("2024-06-17")

exports.handler = async() => {
  console.log("hi")
  await getScoresData()
};