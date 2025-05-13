const hubspot = require('@hubspot/api-client');
const axios = require('axios');

exports.main = async (context = {}) => {
  const { dealId, lineItems } = context.parameters;

  const hubspotClient = new hubspot.Client({
    accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
  });

  if (!dealId || !Array.isArray(lineItems) || lineItems.length === 0) {
    return { success: false, message: 'Missing dealId or lineItems.' };
  }

  try {
    const inputs = lineItems.map((item) => ({
      properties: {
        name: item.name,
        quantity: item.quantity?.toString() || '1',
        price: item.unitCost?.toString() || item.price || '0',
        hs_product_id: item.productId,
        hs_pricing_model: 'flat',
  ...(item.frequency?.toLowerCase() !== 'one_time'
    ? { recurringbillingfrequency: item.frequency.toLowerCase() }
    : {}),
      },
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 20, 
            }
          ]
        }
      ]
    }));
    const createResp = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/line_items/batch/create',
      { inputs },
      {
        headers: {
          Authorization: `Bearer ${process.env['PRIVATE_APP_ACCESS_TOKEN']}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const createdLineItems = createResp.data.results;
    const associationResp = await hubspotClient.crm.deals.associationsApi.getAll(dealId, 'line_items');
    const existingLineItemIds = associationResp.results
      .map(r => r.id)
      .filter(id => !createdLineItems.some(item => item.id === id));

    if (existingLineItemIds.length > 0) {
      const deletePayload = {
        inputs: existingLineItemIds.map(id => ({ id })),
      };

      await axios.post(
        'https://api.hubapi.com/crm/v3/objects/line_items/batch/archive',
        deletePayload,
        {
          headers: {
            Authorization: `Bearer ${process.env['PRIVATE_APP_ACCESS_TOKEN']}`,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    return {
      success: true,
      created: createdLineItems.map(item => ({
        id: item.id,
        name: item.properties?.name
      })),
    };

  } catch (err) {
    console.error("❌ Error occurred:", err.message);
    console.error("❌ Full error:", err.response?.data || err);
    return {
      success: false,
      message: err.message || 'Unexpected error',
    };
  }
};
