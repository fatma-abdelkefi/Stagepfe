import axios from 'axios';

// Typage minimal d’un Work Order Maximo pour récupérer le siteid
interface MaximoWorkOrder {
  wonum: string;
  siteid: string;
}

interface MaximoWOResponse {
  member: MaximoWorkOrder[];
}

/**
 * Add material to a Maximo Work Order
 * @param wonum - Work order number
 * @param materialData - { description, itemnum, quantity, location, barcode? }
 */
export async function addMaterialToWorkOrder(wonum: string, materialData: any) {
  try {
    // Step 1: Get the work order to retrieve siteid
    const woResponse = await axios.get<MaximoWOResponse>(
      `http://demo2.smartech-tn.com/maximo/oslc/os/mxwo?lean=1&oslc.where=wonum="${wonum}"&oslc.select=wonum,siteid`,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          MAXAUTH: 'Basic bWF4YWRtaW46bWF4YWRtIA==',
          properties: '*',
        },
      }
    );

    const workOrder = woResponse.data.member?.[0];
    if (!workOrder || !workOrder.siteid) {
      throw new Error(`Work order ${wonum} not found or missing siteid`);
    }

    console.log('🔹 Work Order siteid:', workOrder.siteid);

    // Step 2: Build payload with siteid
    const payload = {
      wpmaterial: [
        {
          description: materialData.description,
          itemnum: materialData.itemnum,
          quantity: materialData.quantity,
          location: materialData.location,
          barcode: materialData.barcode || '',
          siteid: workOrder.siteid, // ⚡ Use siteid from WO
        },
      ],
    };

    console.log('🔹 Payload to add material:', payload);

    // Step 3: Post material to the work order
    const materialResponse = await axios.post(
      `http://demo2.smartech-tn.com/maximo/oslc/os/SM1122/${wonum}/wpmaterial`,
      payload,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          MAXAUTH: 'Basic bWF4YWRtaW46bWF4YWRtIA==',
          properties: '*',
        },
      }
    );

    console.log('✅ Material added successfully:', materialResponse.data);
    return materialResponse.data;
  } catch (error: any) {
    console.error('❌ Material add error:', error.response?.data || error.message);
    throw error;
  }
}
