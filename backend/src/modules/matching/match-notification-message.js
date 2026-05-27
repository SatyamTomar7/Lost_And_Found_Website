const getMatchCollectionLocation = (foundItem) => {
  if (foundItem?.handledBy === "security") {
    return "University Security Department";
  }

  const block = foundItem?.block;

  if (block) {
    return `Block ${block} Lost and Found Department`;
  }

  return "the Lost and Found Department";
};

const buildMatchNotificationMessage = (
  lostItemName,
  matchScore,
  foundItem
) => {
  const collectionLocation = getMatchCollectionLocation(foundItem);

  return `We found a ${matchScore}% match for your lost ${lostItemName}. Please visit the ${collectionLocation} to verify and collect your item.`;
};

export {
  buildMatchNotificationMessage,
  getMatchCollectionLocation,
};
