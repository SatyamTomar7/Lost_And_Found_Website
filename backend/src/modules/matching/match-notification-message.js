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

const getTransferredFromBlock = (foundItem) =>
  foundItem?.originalBlock || foundItem?.block || null;

const buildMatchNotificationMessage = (
  lostItemName,
  matchScore,
  foundItem
) => {
  const collectionLocation = getMatchCollectionLocation(foundItem);

  return `We found a ${matchScore}% match for your lost ${lostItemName}. Please visit the ${collectionLocation} to verify and collect your item.`;
};

const buildTransferToSecurityNotificationMessage = (itemName, foundItem) => {
  const block = getTransferredFromBlock(foundItem);
  const blockLabel = block ? `Block ${block}` : "the previous";

  return `Your matched item "${itemName}" has now been transferred from ${blockLabel} Lost and Found Department to the University Security Office after 7 days. The ${blockLabel} Lost and Found Department no longer has this item. Please visit the University Security Office for item enquiry, verification, and collection.`;
};

export {
  buildMatchNotificationMessage,
  buildTransferToSecurityNotificationMessage,
  getMatchCollectionLocation,
  getTransferredFromBlock,
};
