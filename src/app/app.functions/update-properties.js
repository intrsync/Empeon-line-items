const hubspot = require('@hubspot/api-client');

exports.main = async (context = {}) => {
  const hubspotClient = new hubspot.Client({
    accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
  });

  try {
    const { hs_object_id } = context.propertiesToSend;
    const { properties } = context.parameters;

    if (Array.isArray(properties.line_item_products)) {
      properties.line_item_products = properties.line_item_products.join(';');
    }

    const data = {
      properties: {
        ...properties,
        products: properties.products?.map(product => product).join(';'),
      },
    };

    properties.products?.map(product => product).join(';');

    if (!hs_object_id) {
      throw new Error('Missing hs_object_id');
    }

    const resp = await hubspotClient.crm.deals.basicApi.update(hs_object_id, data);

    return { success: true };
  } catch (error) {
    console.error('Error in update-properties function:');
    console.error(error.message || error);
    throw error
  }
};
