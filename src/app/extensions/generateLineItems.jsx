import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  NumberInput,
  Divider,
  Box,
  MultiSelect,
  Flex,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  hubspot,
  Select,
  Heading,
  Tile,
  Button,
  EmptyState,
  LoadingButton
} from '@hubspot/ui-extensions';
import { CrmActionLink } from "@hubspot/ui-extensions/crm";

hubspot.extend(({ context, actions, runServerlessFunction }) => (
  <LineItemForm context={context}
    runServerless={runServerlessFunction}
    fetchProperties={actions.fetchCrmObjectProperties}
    updateProperty={actions.setCrmObjectProperty}
    onPropertyUpdate={actions.onCrmPropertiesUpdate}
    sendAlert={actions.addAlert}
    refreshProperties={actions.refreshObjectProperties} />
));

const productIdMap = {
  'Payroll': '1442527619',
  'HR Base Fee': '1561785516',
  'HR Premium': '1442524175',
  'Benefits & ACA Base Fee': '1561785517',
  'Benefits & ACA Administration': '1442553929',
  'Advanced Benefits & ACA': '22248006758',
  'Advanced Benefits Base Fee': '23308368723',
  '1095': '1484663457',
  'W2/1099': '1484663458',
  'Garnishment': '1442560886',
  'New Hire Reporting': '1442554880',
  'Professional Services Per Hour': '1442553937',
  'Initial Implementation': '1442553935',
  'Additional Implementation': '1442554441',
  'Advanced Clock': '1484660241',
  'Standard Clock': '1484660242',
  'Clock Hosting': '1484660233',
  'Clock Configuration': '1442554442',
  'Scheduling': '1788055941',
  'Scheduling Base Fee': '2274030005',
  'Scheduling Per Employee': '1788055941',
  'Scheduling Location': '22248006796',
  'Scheduling Implementation': '2170246315',
  'Time & Attendance': '1442527620',
  'Time and Attendance Base Fee': '1442553931',
  'IVR-Set UP': '1216469367',
  'IVR - Per employee ($50 base fee)': '1216473728',
  'Additional tax filing': '1484663456',
  'Per check': '1702983428',
  'Per check (weekly)': '25020703329',
  'Per check (biweekly)': '25020703332',
  'Per check (semi-monthly)': '25020641418',
  'Per check (monthly)': '25020703336',
  'Base Fee': '1702983429',
  'Onboarding Per New Hire (HHA Industry)': '1442562842',
  'Payroll Base Fee': '1561785514',
  'W2 Base Fee': '26170155150',
  '1095 Base Fee': '26170155151'
};

const productMap = {
  'Payroll': ['Payroll'],
  'ACA Administration': ['Benefits & ACA Base Fee', 'Benefits & ACA Administration'],
  'Advanced Benefits': ['Benefits & ACA Base Fee', 'Advanced Benefits & ACA'],
  'HR': ['HR Premium', 'HR Base Fee'],
  'Scheduling': ['Scheduling', 'Scheduling Implementation', 'Scheduling Base Fee', 'Scheduling Location'],
  'Time and Attendance': ['Time and Attendance Base Fee', 'Time & Attendance', 'Clock Configuration', 'Clock Hosting', 'Advanced Clock', 'Standard Clock'],
  'Onboarding New Hire (HHA Industry)': ['Onboarding Per New Hire (HHA Industry)'],
  'IVR': ['IVR-Set UP', 'IVR - Per employee ($50 base fee)'],
};


const productDropdownOptions = Object.keys(productMap).map(label => ({
  label,
  value: label,
}));

const LineItemForm = ({ context, runServerless, fetchProperties, sendAlert, onPropertyUpdate, refreshProperties }) => {
  const [lineItems, setLineItems] = useState([]);
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);


  useEffect(() => {
    console.log('Products:', products);
  }, [products]);



  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await runServerless({
          name: 'fetch-products',
          parameters: {},
        });

        if (res?.response?.success) {

          setProducts(res.response.products.map(p => ({
            ...p,
            price: parseFloat(p.price || 0),
          })));
        } else {
          console.error('Serverless response error:', res?.response?.message);
        }
      } catch (err) {
        console.error('Serverless call failed:', err);
      }
    }

    fetchProducts();
  }, [context, runServerless]);

  useEffect(() => {
    fetchProperties([
      "line_item_products",
      "number_of_employees",
      "number_of_office_employees",
      "number_of_eins",
      "no__of_advanced_clocks_requested",
      "no__of_standard_clocks_requested",
      "num_ivr_employees",
      "payroll_type",
      "payroll_frequency",
      "scheduling_bill_type"
    ]).then((props) => setProperties(props));

    onPropertyUpdate([
      "line_item_products",
      "number_of_employees",
      "number_of_office_employees",
      "number_of_eins",
      "no__of_advanced_clocks_requested",
      "no__of_standard_clocks_requested",
      "num_ivr_employees",
      "payroll_type",
      "payroll_frequency",
      "scheduling_bill_type"
    ], (props) => setProperties((prev) => ({ ...prev, ...props })));
  }, [fetchProperties, onPropertyUpdate]);

  const selectedProducts = properties.line_item_products?.split(';') || [];
  const numEmployees = parseInt(properties.number_of_employees) || 0;
  const numOfficeEmployees = parseInt(properties.number_of_office_employees) || 0;
  const numLocations = parseInt(properties.number_of_eins) || 0;
  const numAdvClocks = parseInt(properties.no__of_advanced_clocks_requested) || 0;
  const numStdClocks = parseInt(properties.no__of_standard_clocks_requested) || 0;
  const numIvrEmployees = parseInt(properties.num_ivr_employees) || 0;
  const payrollType = properties.payroll_type || '';
  const payrollFreq = properties.payroll_frequency || '';
  const schedulingBillType = properties.scheduling_bill_type || '';

  const crmValueMap = {
    'Payroll': 'Payroll',
    'Payroll - Per Check': 'Payroll - Per Check',
    'ACA Administration': 'ACA Administration',
    'Advanced Benefits': 'Advanced Benefits',
    'HR': 'HR',
    'Scheduling': 'Scheduling',
    'Time and Attendance': 'Time and Attendance',
    'Onboarding New Hire (HHA Industry)': 'Onboarding New Hire (HHA Industry)',
    'IVR': 'IVR'
  };


  const updatePropertyValue = useCallback(async (property, value) => {
    console.log('Updating property:', property, 'to value:', value);

    runServerless({
      name: 'update-properties',
      parameters: {
        properties: { [property]: value },
      },
      propertiesToSend: ['hs_object_id'],
    })
      .then(() => {
        refreshProperties(); // pull latest CRM values after setting
      })
      .catch(err => {
        console.error('Property update failed:', err);
      });
  }, [runServerless, refreshProperties]);


  const getProduct = (id, qty = 1) => {
    const product = products.find(p => p.id === id);
    if (!product) return null;

    let unitCost = product.price || 0;

    if (id === productIdMap['Per check']) {
      const multiplierMap = {
        weekly: 52,
        biweekly: 26,
        semimonthly: 24,
        monthly: 12,
      };
      const multiplier = multiplierMap[payrollFreq] || 1;
      unitCost *= multiplier;
    }

    return {
      name: product.name,
      unitCost,
      quantity: qty,
      amount: unitCost * qty,
      frequency: product.frequency || 'one_time',
      productId: id,
      exclude_from_total: product.exclude_from_total || 'false',
    };
  };

  const postAcaItems = [];
  const preAcaItems = [];

  useEffect(() => {
    const items = [];

    // Enforce a fixed order regardless of selection order
    const orderedProducts = [
      'Payroll',
      'HR',
      'Time and Attendance',
      'Scheduling',
      'Advanced Benefits',
      'ACA Administration',
      'Onboarding New Hire (HHA Industry)',
      'IVR'
    ];

    for (const product of orderedProducts) {
      if (!selectedProducts.includes(product)) continue;

      switch (product) {
        case 'Payroll': {
          if (payrollType === 'per_check') {
            let perCheckProductId;
            switch (payrollFreq) {
              case 'weekly':
                perCheckProductId = productIdMap['Per check (weekly)'];
                break;
              case 'biweekly':
                perCheckProductId = productIdMap['Per check (biweekly)'];
                break;
              case 'semimonthly':
                perCheckProductId = productIdMap['Per check (semi-monthly)'];
                break;
              case 'monthly':
                perCheckProductId = productIdMap['Per check (monthly)'];
                break;
              default:
                perCheckProductId = productIdMap['Per check'];
            }
            items.push(getProduct(perCheckProductId, numEmployees));
            items.push(getProduct(productIdMap['Base Fee'], numLocations));
            items.push(getProduct(productIdMap['W2/1099'], 1));
            items.push(getProduct(productIdMap['W2 Base Fee'], numLocations));
            items.push(getProduct(productIdMap['Additional tax filing'], 1));
            items.push(getProduct(productIdMap['New Hire Reporting'], 1));
            items.push(getProduct(productIdMap['Garnishment'], 1));
            items.push(getProduct(productIdMap['Professional Services Per Hour'], 0));
            items.push(getProduct(productIdMap['Initial Implementation'], 1));
            items.push(getProduct(productIdMap['Additional Implementation'], 1));
          } else {
            items.push(getProduct(productIdMap['Payroll'], numEmployees));
            items.push(getProduct(productIdMap['Payroll Base Fee'], numLocations));
            items.push(getProduct(productIdMap['W2/1099'], 1));
            items.push(getProduct(productIdMap['W2 Base Fee'], numLocations));
            items.push(getProduct(productIdMap['Additional tax filing'], 1));
            items.push(getProduct(productIdMap['New Hire Reporting'], 1));
            items.push(getProduct(productIdMap['Garnishment'], 1));
            items.push(getProduct(productIdMap['Professional Services Per Hour'], 0));
            items.push(getProduct(productIdMap['Initial Implementation'], 1));
            items.push(getProduct(productIdMap['Additional Implementation'], 1));
          }
          break;
        }

        case 'HR': {
          items.push(getProduct(productIdMap['HR Premium'], numOfficeEmployees));
          items.push(getProduct(productIdMap['HR Base Fee'], numLocations));
          break;
        }

        case 'ACA Administration': {
          items.push(getProduct(productIdMap['Benefits & ACA Administration'], numEmployees));
          items.push(getProduct(productIdMap['Benefits & ACA Base Fee'], numLocations));
          items.push(getProduct(productIdMap['1095'], 1));
          items.push(getProduct(productIdMap['1095 Base Fee'], numLocations));
          break;
        }

        case 'Advanced Benefits': {
          items.push(getProduct(productIdMap['Advanced Benefits & ACA'], numEmployees));
          items.push(getProduct(productIdMap['Advanced Benefits Base Fee'], numLocations));
          break;
        }

        case 'Scheduling': {

          if (schedulingBillType === 'per_location') {
            items.push(getProduct(productIdMap['Scheduling Implementation'], 1));
            items.push(getProduct(productIdMap['Scheduling Location'], numLocations));
          } else if (schedulingBillType === 'per_employee') {
            items.push(getProduct(productIdMap['Scheduling'], numEmployees));
            items.push(getProduct(productIdMap['Scheduling Base Fee'], numLocations));
            items.push(getProduct(productIdMap['Scheduling Implementation'], 1));
          }
          break;
        }


        case 'Time and Attendance': {
          const clockTotal = numAdvClocks + numStdClocks;
          items.push(getProduct(productIdMap['Time & Attendance'], numOfficeEmployees));
          items.push(getProduct(productIdMap['Time and Attendance Base Fee'], numLocations));
          items.push(getProduct(productIdMap['Standard Clock'], numStdClocks));
          items.push(getProduct(productIdMap['Advanced Clock'], numAdvClocks));
          items.push(getProduct(productIdMap['Clock Hosting'], clockTotal));
          items.push(getProduct(productIdMap['Clock Configuration'], clockTotal));
          break;
        }

        case 'Onboarding New Hire (HHA Industry)': {
          items.push(getProduct(productIdMap['Onboarding Per New Hire (HHA Industry)'], 1));
          break;
        }

        case 'IVR': {
          items.push(getProduct(productIdMap['IVR-Set UP'], 1));
          items.push(getProduct(productIdMap['IVR - Per employee ($50 base fee)'], numLocations));
          break;
        }

        default: {
          const productNames = productMap[product] || [];
          for (const name of productNames) {
            items.push(getProduct(productIdMap[name], 1));
          }
        }
      }
    }

    const validItems = items.filter(item => item && typeof item.name === 'string');
    setLineItems(validItems);
  }, [
    selectedProducts,
    numEmployees,
    numOfficeEmployees,
    numLocations,
    numAdvClocks,
    numStdClocks,
    numIvrEmployees,
    payrollType,
    payrollFreq,
    schedulingBillType
  ]);

  const generateLineItems = useCallback(async () => {
    try {
      setLoading(true);

      const resp = await runServerless({
        name: 'create-line-items',
        parameters: {
          dealId: context.crm.objectId,
          lineItems: lineItems.map(item => ({
            ...item,
            name: item.name || 'Unnamed Product',
          })),
        }
      });


      console.log('resp', resp);

      sendAlert({
        title: "Line Items Generated!",
        message: `Successfully added ${lineItems.length} item(s).`,
        type: "success",
      });

      refreshProperties();
    } catch (error) {
      console.error('Error generating line items:', error);
      sendAlert({
        title: "Failed to generate line items",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }
    , [runServerless, context.crm.objectId, lineItems]);


  return (
    <Flex direction="column" gap="medium">
      <MultiSelect
        name="products"
        label="Products"
        options={productDropdownOptions}
        value={selectedProducts.filter(p => productDropdownOptions.some(opt => opt.value === p))}
        onChange={(val) => {
          const hubspotValues = val.map(p => crmValueMap[p]).filter(Boolean);
          updatePropertyValue('line_item_products', hubspotValues.join(';'));
        }}
      />

      {selectedProducts.length > 0 && (
        <Tile compact>
          {
            (() => {
              const renderedFields = new Set();

              const field = (key, component) => {
                if (renderedFields.has(key)) return null;
                renderedFields.add(key);
                return component;
              };

              return (
                <>
                  {selectedProducts.includes('Payroll') && (
                    <>
                      {field(
                        'payrollType',
                        <Select
                          name="payrollType"
                          label="Payroll Type"
                          value={payrollType}
                          onChange={(val) => {
                            updatePropertyValue('payroll_type', val);
                          }}
                          options={[
                            { label: 'PEPM', value: 'pepm' },
                            { label: 'Per Check', value: 'per_check' },
                          ]}
                        />

                      )}
                      {payrollType === 'per_check' &&
                        field(
                          'payrollFreq',
                          <Select
                            name="payrollFreq"
                            label="Payroll Frequency"
                            value={payrollFreq}
                            onChange={(val) => {
                              updatePropertyValue('payroll_frequency', val);
                            }}
                            options={[
                              { label: 'Weekly', value: 'weekly' },
                              { label: 'Bi Weekly', value: 'biweekly' },
                              { label: 'Semi Monthly (Twice a month)', value: 'semimonthly' },
                              { label: 'Monthly', value: 'monthly' },
                            ]}
                          />

                        )}
                    </>
                  )}

                  {(selectedProducts.includes('ACA Administration') ||
                    selectedProducts.includes('Advanced Benefits') ||
                    selectedProducts.includes('Payroll') ||
                    (selectedProducts.includes('Scheduling') && schedulingBillType === 'per_employee')) &&
                    field(
                      'numEmployees',
                      <NumberInput
                        name="numEmployees"
                        label="Number of Employees"
                        value={numEmployees}
                        onChange={(val) => {
                          updatePropertyValue('number_of_employees', val);
                        }}
                      />

                    )}

                    

                  {(selectedProducts.includes('HR') ||
                    selectedProducts.includes('Time and Attendance')) &&
                    field(
                      'numOfficeEmployees',
                      <NumberInput
                        name="numOfficeEmployees"
                        label="Number of Office Employees"
                        value={numOfficeEmployees}
                        onChange={(val) => {
                          updatePropertyValue('number_of_office_employees', val);
                        }}
                      />
                    )
                  }

                  {selectedProducts.includes('Scheduling') &&
                    field(
                      'schedulingBillType',
                      <Select
                        name="schedulingBillType"
                        label="Scheduling Bill Type"
                        value={schedulingBillType}
                        onChange={(val) => {
                          updatePropertyValue('scheduling_bill_type', val);
                        }}
                        options={[
                          { label: 'Per Employee', value: 'per_employee' },
                          { label: 'Per Location', value: 'per_location' },
                        ]}
                      />
                    )}

                  {(
                    selectedProducts.includes('Scheduling') ||
                    selectedProducts.includes('Time and Attendance') ||
                    selectedProducts.includes('IVR') ||
                    selectedProducts.includes('Payroll') ||
                    selectedProducts.includes('ACA Administration') ||
                    selectedProducts.includes('Advanced Benefits') ||
                    selectedProducts.includes('HR')
                  ) &&
                    field(
                      'numLocations',
                      <NumberInput
                        name="numLocations"
                        label="Number of Locations"
                        value={numLocations}
                        onChange={(val) => {
                          updatePropertyValue('number_of_eins', val);
                        }}
                      />
                    )}

                  {selectedProducts.includes('Time and Attendance') &&
                    field(
                      'numAdvClocks',
                      <NumberInput
                        name="numAdvClocks"
                        label="Number of Advanced Clocks"
                        value={numAdvClocks}
                        onChange={(val) => {
                          updatePropertyValue('no__of_advanced_clocks_requested', val);
                        }}
                      />

                    )}

                  {selectedProducts.includes('Time and Attendance') &&
                    field(
                      'numStdClocks',
                      <NumberInput
                        name="numStdClocks"
                        label="Number of Standard Clocks"
                        value={numStdClocks}
                        onChange={(val) => {
                          updatePropertyValue('no__of_standard_clocks_requested', val);
                        }}
                      />

                    )}

                  {selectedProducts.includes('IVR') &&
                    field(
                      'numIvrEmployees',
                      <NumberInput
                        name="numIvrEmployees"
                        label="Number of IVR Employees"
                        value={numIvrEmployees}
                        onChange={(val) => {
                          updatePropertyValue('num_ivr_employees', val);
                        }}
                      />


                    )}
                </>
              );
            })()
          }
        </Tile>
      )}

      <Flex direction="row" gap="small" justify="between" align="center">
        <Heading>Line Items</Heading>
        <LoadingButton
          loading={loading}
          variant="primary"
          disabled={lineItems.length <= 0}
          onClick={generateLineItems}
        >
          Generate Line Items
        </LoadingButton>

      </Flex>

      {lineItems.length > 0 ? (
        <Table bordered={false} paginated={false}>
          <TableHead>
            <TableRow style={{ backgroundColor: '#2c2f66' }}>
              <TableHeader style={{ color: 'white' }}>ITEM</TableHeader>
              <TableHeader style={{ color: 'white' }}>PRICE</TableHeader>
              <TableHeader style={{ color: 'white' }}>QTY</TableHeader>
              <TableHeader style={{ color: 'white' }}>TOTAL</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {lineItems.map((item, idx) => (
              <TableRow key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#f8f9fa' : '#ffffff' }}>
                <TableCell style={{ fontWeight: 'bold' }}>
                  {item.productId ? (
                    <CrmActionLink
                      actionType="PREVIEW_OBJECT"
                      actionContext={{
                        objectTypeId: "0-7", // HubSpot Product object type ID
                        objectId: item.productId,
                      }}
                    >
                      {item.name || 'Unnamed Product'}
                    </CrmActionLink>
                  ) : (
                    item.name || 'Unnamed Product'
                  )}
                </TableCell>
                <TableCell>
                  ${parseFloat(item.unitCost).toFixed(2)}/{(item.frequency === 'one_time' ? 'One Time' : item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1))}
                </TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  ${parseFloat(item.amount).toFixed(2)}/{(item.frequency === 'one_time' ? 'One Time' : item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState
          title="Nothing here yet"
          imageWidth={150}
          layout="vertical"
          reverseOrder={true}
        >
          <Text>
            Line items will appear here once you select products and enter details.
          </Text>
        </EmptyState>
      )}
    </Flex>
  );
};

export default LineItemForm;
