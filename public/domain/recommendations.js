import { savings, CARBON_ASSUMPTION } from './impact.js';
import { cleanPreferences } from './profile.js';

const AIR_SOURCE = 'https://airquality.cpcb.gov.in/AQI_India/';
const INDOOR_SOURCE = 'https://www.epa.gov/wildfires/how-create-cleaner-air-room-home';

function activityAction(profile) {
  const known = Number.isFinite(profile.aqi);
  const cautious = known && (profile.aqi > 200 || (profile.sensitive && profile.aqi > 100));
  let title = 'Check the air before planning outdoor time';
  let text = 'Refresh local air and check official advisories before deciding on outdoor exercise.';
  let reason = 'No air reading has been loaded for this location.';
  if (known) {
    title = cautious
      ? 'Move energetic activity to cleaner indoor air'
      : 'Plan outdoor time around current conditions';
    text = cautious
      ? 'Use a cleaner-air indoor space and reduce strenuous activity near traffic.'
      : 'Choose quieter routes and recheck air conditions before heading out.';
    reason = `${profile.sensitive ? 'Your household includes sensitive members. ' : ''}Your modeled Indian AQI estimate is ${profile.lowerBound ? 'at least ' : ''}${profile.aqi}.`;
  }
  return {
    id: 'move',
    type: 'outdoor',
    icon: '↗',
    tag: 'MORNING / EXPOSURE',
    title,
    text,
    reason,
    impact:
      'Reducing time and exertion near polluted roads can reduce inhaled particle exposure. This is not a measured health benefit.',
    benefit: 'Exposure reduction',
    source: AIR_SOURCE,
  };
}

function indoorAction(profile) {
  let reason = 'You have not indicated that an air cleaner is available.';
  if (profile.purifier) reason = 'You already have an air cleaner.';
  else if (profile.budget === 'low')
    reason = 'Your preference is to start with no-cost improvements.';
  const cooking =
    profile.cooking === 'electric'
      ? 'Even electric cooking can release particles; use cooking exhaust.'
      : 'Use an externally vented cooking exhaust and never block combustion ventilation.';
  return {
    id: 'room',
    type: 'indoor',
    icon: '⌂',
    tag: 'EVENING / INDOOR AIR',
    title: profile.purifier
      ? 'Use your air cleaner where the family gathers'
      : 'Reduce indoor sources before buying equipment',
    text: profile.purifier
      ? 'Run a properly sized, ozone-free particle filter and follow its maintenance instructions.'
      : 'Skip incense and candles, damp-dust surfaces, and avoid indoor smoking.',
    reason,
    impact: `${cooking} Removing smoke sources reduces indoor particles; filtration effectiveness depends on room size, leakage, and maintenance. Ventilate when outdoor conditions improve and keep the space safe and comfortable.`,
    benefit: 'Indoor source reduction',
    source: INDOOR_SOURCE,
  };
}

function communityAction(profile) {
  return {
    id: 'share',
    type: 'community',
    icon: '♧',
    tag: 'TOGETHER / COMMUNITY',
    title: profile.sensitive
      ? 'Make a shared smog-day plan for vulnerable people'
      : 'Coordinate a lower-pollution neighbourhood routine',
    text: profile.sensitive
      ? 'Ask schools or neighbours about cleaner indoor activities and support for people who need help.'
      : 'Coordinate errands or shared trips and discourage waste and leaf burning.',
    reason: profile.sensitive
      ? 'A shared response can help households with children, older adults, or sensitive members.'
      : 'Fewer duplicate journeys and smoke sources benefit shared spaces.',
    impact:
      'Shared trips can reduce vehicle activity; avoiding open burning removes a local smoke source. No community-wide AQI reduction is claimed or measured.',
    benefit: 'Shared source reduction',
    source: AIR_SOURCE,
  };
}

function travelOptions(profile) {
  if (profile.travelMode === 'unknown')
    return {
      title: 'Choose a travel option that fits your routine',
      text: 'Set your usual travel mode in household preferences to compare practical lower-emission options.',
      reason:
        'Your usual travel mode has not been set, so no car-substitution savings are claimed.',
    };
  if (profile.travelMode === 'remote' || profile.commute === 0)
    return {
      title: 'Combine essential errands into one trip',
      text: 'Avoid unnecessary vehicle trips; arrange a shared errand when practical.',
      reason: 'You have no regular commute.',
    };
  const cautious =
    profile.aqi > 200 || (Number.isFinite(profile.aqi) && profile.sensitive && profile.aqi > 100);
  const reason = `Your usual mode is ${profile.travelMode.replace('-', ' ')} and your daily round trip is ${profile.commute} km.`;
  if (profile.travelMode === 'car')
    return {
      title: 'Replace a solo-car trip where transit is practical',
      text: `For your ${profile.commute} km round trip, compare enclosed public transport or a shared ride.${cautious ? ' In elevated pollution, avoid strenuous roadside cycling.' : ''}`,
      reason,
    };
  const alternative =
    profile.travelMode === 'two-wheeler'
      ? 'Consider enclosed public transport during heavy smog.'
      : 'Continue practical public transport or shared travel.';
  return {
    title: 'Keep travel low-emission and reduce roadside exposure',
    text: `${alternative} Avoid strenuous roadside cycling when pollution is poor.`,
    reason,
  };
}

function commuteAction(profile) {
  const car = profile.travelMode === 'car' && profile.commute > 0;
  const potentialCarbonKg = car ? savings(profile.commute, 1) : null;
  return {
    id: 'commute',
    type: 'outdoor',
    icon: '↘',
    tag: 'DAYTIME / TRAVEL',
    ...travelOptions(profile),
    impact: car
      ? `Potential saving: ${potentialCarbonKg} kg CO2 per substituted trip. ${CARBON_ASSUMPTION} Enclosed travel may reduce roadside exposure, but this is not a quantified health outcome.`
      : 'Carbon savings are not estimated against a solo-car baseline that does not match your routine. Fewer trips reduce emissions at source; exposure depends on conditions and travel mode.',
    benefit: car ? 'Illustrative carbon saving' : 'Practical lower-emission travel',
    source: AIR_SOURCE,
    potentialCarbonKg,
  };
}

/** Pure policy composition: no persistence, provider calls, or rendering. */
export function buildPlan(input) {
  const profile = { ...input, ...cleanPreferences(input) };
  return [
    activityAction(profile),
    indoorAction(profile),
    communityAction(profile),
    commuteAction(profile),
  ];
}
