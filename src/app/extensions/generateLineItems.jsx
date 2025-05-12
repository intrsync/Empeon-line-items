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
  'Advanced Benefits & ACA': '1442524175',
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
  'Scheduling Location': 'N/A',
  'Time & Attendance': '1442527620',
  'Time and Attendance Base Fee': '1442553931',
  'IVR-Set UP': '1216469367',
  'IVR - Per employee ($50 base fee)': '1216473728',
  'Additional tax filing': '1484663456',
  'Per check': '1702983428',
  'Base Fee': '1702983429',
  'Onboarding Per New Hire (HHA Industry)': '1442562842',
  'Payroll Base Fee': '1561785514',
};

const productMap = {
  'Payroll': ['Payroll'],
  'Benefits & ACA': ['Benefits & ACA Base Fee', 'Benefits & ACA Administration'],
  'Advanced Benefits': ['Advanced Benefits & ACA'],
  'HR': ['HR Premium', 'HR Base Fee'],
  'Scheduling': ['Scheduling', 'Scheduling Base Fee', 'Scheduling Location'],
  'Time and Attendance': ['Time and Attendance Base Fee', 'Clock Configuration', 'Clock Hosting', 'Advanced Clock', 'Standard Clock'],
  'Onboarding New Hire (HHA Industry)': ['Onboarding Per New Hire (HHA Industry)'],
  'IVR': ['IVR-Set UP', 'IVR - Per employee ($50 base fee)'],
};


const productDropdownOptions = Object.keys(productMap).map(label => ({
  label,
  value: label,
}));

const LineItemForm = ({ context, runServerless, fetchProperties, sendAlert, onPropertyUpdate, refreshProperties }) => {
  const [productPrices, setProductPrices] = useState({});
  const [lineItems, setLineItems] = useState([]);
  const [properties, setProperties] = useState({});
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await runServerless({
          name: 'fetch-products',
          parameters: {},
        });

        if (res?.response?.success) {
          const prices = {};
          res.response.products.forEach(p => {
            prices[p.value] = parseFloat(p.price);
          });

          setProductPrices(prices);
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
      "payroll_frequency"
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

  useEffect(() => {
    // Fetch product pricing
    runServerless({ name: 'fetch-products', parameters: {} }).then(res => {
      if (res?.response?.success) {
        const prices = {};
        res.response.products.forEach(p => {
          prices[p.value] = parseFloat(p.price);
        });
        setProductPrices(prices);
      }
    });
  }, [runServerless]);

  const getPrice = (id, prices) => {
    return prices[id] !== undefined ? prices[id] : 0;
  };

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
    'Benefits & ACA': 'Benefits & ACA',
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




  useEffect(() => {
    const items = [];

    const add = (label, unitCost, quantity, freq, productId = null) => {
      items.push({
        name: label,
        unitCost,
        quantity,
        amount: unitCost * quantity,
        frequency: freq,
        productId,
      });
    };


    const get = (name) => getPrice(productIdMap[name], productPrices);

    if (selectedProducts.includes('Payroll')) {
      const pepmRate = get('Payroll');
      const baseFee = get('Payroll Base Fee');

      if (payrollType === 'pepm') {
        add('Payroll PEPM', pepmRate, numEmployees, 'Monthly', productIdMap['Payroll']);
        add('Payroll Base Fee', baseFee, 1, 'Monthly', productIdMap['Payroll Base Fee']);
      }

      if (payrollType === 'per_check') {
        const freqRates = { weekly: 2, biweekly: 4, semimonthly: 4, monthly: 8 };
        const baseFees = { weekly: 50, biweekly: 100, semimonthly: 100, monthly: 200 };

        add(`Payroll Per Check (${payrollFreq})`, freqRates[payrollFreq], numEmployees, 'Monthly', productIdMap['Per check']);
        add(`Payroll Base Fee (${payrollFreq})`, baseFees[payrollFreq], 1, 'Monthly', productIdMap['Base Fee']);
      }

      add('1095', get('1095'), 1, 'Yearly', productIdMap['1095']);
      add('1095 Base Fee', get('Base Fee'), 1, 'Yearly', productIdMap['Base Fee']);
      add('W2/1099', get('W2/1099'), 1, 'Yearly', productIdMap['W2/1099']);
      add('W2/1099 Base Fee', get('Base Fee'), 1, 'Yearly', productIdMap['Base Fee']);
      add('Additional Tax Filing', get('Additional tax filing'), 1, 'Yearly', productIdMap['Additional tax filing']);
      add('Initial Implementation', Math.max(get('Initial Implementation'), 3000), 1, 'One Time', productIdMap['Initial Implementation']);
      add('Additional Implementation', get('Additional Implementation'), 1, 'One Time', productIdMap['Additional Implementation']);
      add('Garnishment', get('Garnishment'), 1, 'One Time', productIdMap['Garnishment']);
      add('New Hire Reporting', get('New Hire Reporting'), 1, 'One Time', productIdMap['New Hire Reporting']);
      add('Professional Services Per Hour', get('Professional Services Per Hour'), 1, 'One Time', productIdMap['Professional Services Per Hour']);
    }

    if (selectedProducts.includes('Benefits & ACA')) {
      add('Benefits & ACA Base Fee', get('Benefits & ACA Base Fee'), 1, 'Monthly', productIdMap['Benefits & ACA Base Fee']);
      add('Benefits & ACA Per Employee', get('Benefits & ACA Administration'), numEmployees, 'Monthly', productIdMap['Benefits & ACA Administration']);
    }

    if (selectedProducts.includes('Advanced Benefits')) {
      add('Advance Benefits Base Fee', get('Benefits & ACA Base Fee'), 1, 'Monthly', productIdMap['Benefits & ACA Base Fee']);
      add('Advance Benefits & ACA Per Employee', get('Advanced Benefits & ACA'), numEmployees, 'Monthly', productIdMap['Advanced Benefits & ACA']);
    }

    if (selectedProducts.includes('HR')) {
      add('HR Base Fee', get('HR Base Fee'), 1, 'Monthly', productIdMap['HR Base Fee']);
      add('HR Per Office Employee', get('HR Premium'), numOfficeEmployees, 'Monthly', productIdMap['HR Premium']);
    }

    if (selectedProducts.includes('Scheduling')) {
      add('Scheduling Base Fee', get('Scheduling Base Fee'), 1, 'Monthly', productIdMap['Scheduling Base Fee']);
      if (schedulingBillType === 'per_employee') {
        add('Scheduling Per Employee', get('Scheduling'), numEmployees, 'Monthly', productIdMap['Scheduling']);
      } else if (schedulingBillType === 'per_location') {
        add('Scheduling Per Location', get('Scheduling Location'), numLocations, 'Monthly', productIdMap['Scheduling Location']);
      }
    }

    if (selectedProducts.includes('Onboarding New Hire (HHA Industry)')) {
      add('Onboarding Per New Hire (HHA Industry)', get('Onboarding Per New Hire (HHA Industry)'), 1, 'One Time', productIdMap['Onboarding Per New Hire (HHA Industry)']);
    }

    if (selectedProducts.includes('Time and Attendance')) {
      add('Time & Attendance Base Fee', get('Time and Attendance Base Fee'), 1, 'Monthly', productIdMap['Time and Attendance Base Fee']);
      add('Scheduling for Time & Attendance', 5, numOfficeEmployees, 'Monthly'); // No product ID for this one

      if (numAdvClocks > 0 || numStdClocks > 0) {
        add('Clock Configuration', get('Clock Configuration'), 1, 'One Time', productIdMap['Clock Configuration']);
        add('Clock Hosting', get('Clock Hosting'), 1, 'Monthly', productIdMap['Clock Hosting']);
      }

      if (numAdvClocks > 0) {
        add('Advanced Clocks', get('Advanced Clock'), numAdvClocks, 'One Time', productIdMap['Advanced Clock']);
      }

      if (numStdClocks > 0) {
        add('Standard Clocks', get('Standard Clock'), numStdClocks, 'One Time', productIdMap['Standard Clock']);
      }
    }

    if (selectedProducts.includes('IVR')) {
      add('IVR Base Fee', 50, 1, 'Monthly'); // This is a hardcoded base fee, no HubSpot product ID
      add('IVR Setup Fee', get('IVR-Set UP'), 1, 'One Time', productIdMap['IVR-Set UP']);
      add('IVR Per Employee', get('IVR - Per employee ($50 base fee)'), numIvrEmployees, 'Monthly', productIdMap['IVR - Per employee ($50 base fee)']);
    }



    setLineItems(items);
  }, [
    selectedProducts,
    numEmployees,
    numOfficeEmployees,
    numLocations,
    numAdvClocks,
    numStdClocks,
    schedulingBillType,
    numIvrEmployees,
    payrollType,
    payrollFreq,
    productPrices
  ]);

  const generateLineItems = useCallback(async () => {
    try {
      setLoading(true);

      const resp = await runServerless({
        name: 'create-line-items',
        parameters: {
          dealId: context.crm.objectId,
          lineItems,
        }
      });

      console.log('resp', resp);

      sendAlert({
        title: "Line Items Generated!",
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
        value={selectedProducts}
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

                  {(selectedProducts.includes('Benefits & ACA') ||
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

                  {selectedProducts.includes('Scheduling') &&
                    schedulingBillType === 'per_location' &&
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
                    {item.name}
                  </CrmActionLink>
                ) : (
                  item.name
                )}
              </TableCell>
              <TableCell>
                ${parseFloat(item.unitCost).toFixed(2)}/{item.frequency.toLowerCase()}
              </TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                ${parseFloat(item.amount).toFixed(2)}/{item.frequency.toLowerCase()}
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
