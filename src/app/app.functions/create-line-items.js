const hubspot = require('@hubspot/api-client');
const axios = require('axios');

exports.main = async (context = {}) => {
  const { dealId, lineItems } = context.parameters;

  const hubspotClient = new hubspot.Client({
    accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
  });

  try {
    if (!dealId || !Array.isArray(lineItems) || lineItems.length === 0) {
      return { success: false, message: 'Missing dealId or lineItems.' };
    }

    console.log(lineItems)
    console.log('exclude_from_total', lineItems[0].exclude_from_total)

    // Delete existing line items associated with the deal first
    const associationResp = await hubspotClient.crm.deals.associationsApi.getAll(dealId, 'line_items');
    const existingLineItemIds = associationResp.results.map(r => r.id);
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

    // Batch create line items in order
    const batchInputs = lineItems.map((item, idx) => ({
      properties: {
        name: item.name,
        quantity: item.quantity?.toString() || '1',
        price: (item.exclude_from_total === true || item.exclude_from_total === 'true') ? '0' : String(item.unitCost ?? item.price ?? 0),
        display_price: item.unitCost?.toString() || item.price || '0',
        hs_product_id: item.productId,
        hs_position_on_quote: idx.toString(),
        // hs_pricing_model: 'flat',
        // ...(item.frequency?.toLowerCase() !== 'one_time' ? { recurringbillingfrequency: item.frequency.toLowerCase() } : {}),
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

    const resp = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/line_items/batch/create',
      { inputs: batchInputs },
      {
        headers: {
          Authorization: `Bearer ${process.env['PRIVATE_APP_ACCESS_TOKEN']}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const createdLineItems = resp.data.results?.map(r => ({
      id: r.id,
      name: r.properties?.name
    })) || [];

    return {
      success: true,
      created: createdLineItems,
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
