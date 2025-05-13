const hubspot = require('@hubspot/api-client');

exports.main = async (context = {}) => {
  console.log("fetch-products function called with parameters:", context.parameters);

  const hubspotClient = new hubspot.Client({
    accessToken: process.env['PRIVATE_APP_ACCESS_TOKEN'],
  });

  try {
    const limit = 100;
    const archived = false;
    const properties = ['name', 'price', 'recurringbillingfrequency', 'hs_object_id'];

    const response = await hubspotClient.crm.products.basicApi.getPage(
      limit,
      undefined,
      properties,
      undefined,
      undefined,
      archived
    );

    // Replace these with the actual hs_object_ids for allowed products
    const allowedIds = [
      '1216469367', '1216473728', '1442524175', '1442527619', '1442527620', '1442553929',
      '1442553931', '1442553932', '1442553935', '1442553937', '1442554441', '1442554442',
      '1442554880', '1442560886', '1442560887', '1442560888', '1442561869', '1442561870',
      '1442561871', '1442562841', '1442562842', '1484660233', '1484660241', '1484660242',
      '1484663456', '1484663457', '1484663458', '1561785514', '1561785516', '1561785517',
      '1702983428', '1702983429', '1788055941', '1809479273', '2170246315', '2274030005',
      '2353948322', '2354175324', '22248006758'];

    const filtered = response.results.filter(product =>
      allowedIds.includes(product.properties.hs_object_id)
    );

    return {
      success: true,
      products: filtered.map(p => ({
        label: p.properties.name,
        name: p.properties.name,
        value: p.properties.hs_object_id,
        price: p.properties.price,
        frequency: p.properties.recurringbillingfrequency || 'one_time',
      })),
    };
  } catch (error) {
    console.error("❌ fetch-products error:", error.message, error.stack);
    return {
      success: false,
      message: error.message || "Unknown server error",
    };
  }
};
