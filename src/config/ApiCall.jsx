import { v4 as uuid } from "uuid";

const API_URL =
  "https://2c5owgz3oe.execute-api.ap-south-1.amazonaws.com/Dev/develoment";
// "https://vkij0y39nl.execute-api.ap-south-1.amazonaws.com/Dev/develoment";

// Function to fetch tags data
export const fetchTagsData = async (type, currentLoc, checkboxes) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        actionone: "tags",
        action: type,
        location: currentLoc,
        checkstatus: checkboxes,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching tags data:", error);
    throw error;
  }
};

// Function to list objects
export const listObjects = async (type, currentLoc) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        actionone: "pagination",
        action: type,
        location: currentLoc,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error listing objects:", error);
    throw error;
  }
};

export const getUploadData = async (inputFields, userEmail, currentFolder) => {
  const requests = inputFields.map(async (field) => {
    const uniqueId = uuid();
    const objectName = field.selectedFile[0].name;

    // Get presigned URL
    const presignedUrlResponse = await fetch(
      "https://2c5owgz3oe.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
      // "https://vkij0y39nl.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
      {
        method: "POST",
        body: JSON.stringify({
          object_name: objectName,
          action: "S3",
          uid: uniqueId,
          userinfo: userEmail,
          current_Folder: currentFolder,
        }),
      }
    );
    const presignedURL = await presignedUrlResponse.json();

    // Upload file to S3
    await fetch(presignedURL, {
      method: "PUT",
      headers: {
        "x-amz-meta-uid": uniqueId,
        "x-amz-meta-userinfo": userEmail,
      },
      body: field.selectedFile[0],
    });

    // Upload metadata to DynamoDB
    await fetch(
      "https://2c5owgz3oe.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
      // "https://vkij0y39nl.execute-api.ap-south-1.amazonaws.com/Dev/develoment",
      {
        method: "POST",
        body: JSON.stringify({
          description: field.description,
          manualtags: field.manualtags,
          object_name: currentFolder + objectName,
          action: "dynamo",
          uid: uniqueId,
          userinfo: userEmail,
        }),
      }
    );
  });

  await Promise.all(requests);
};

// Function to create a Kendra index
export const createKendraIndex = async () => {
  try {
    const response = await fetch(
      "https://cvpk976axb.execute-api.ap-south-1.amazonaws.com/Dev/create",
      // "https://b70s81u3u3.execute-api.ap-south-1.amazonaws.com/Dev/create",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating Kendra index:", error);
    throw error; // Rethrow error to be handled by the caller
  }
};

// Function to check Kendra status
export const getKendraStatus = async () => {
  try {
    const response = await fetch(
      "https://cvpk976axb.execute-api.ap-south-1.amazonaws.com/Dev/KendraStatus",
      // "https://b70s81u3u3.execute-api.ap-south-1.amazonaws.com/Dev/KendraStatus",
      {
        method: "POST",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Kendra status:", error);
    throw error; // Rethrow error to be handled by the caller
  }
};

// Function to check step function status
export const getStepFunctionStatus = async () => {
  try {
    const response = await fetch(
      "https://cvpk976axb.execute-api.ap-south-1.amazonaws.com/Dev/status ",
      // "https://b70s81u3u3.execute-api.ap-south-1.amazonaws.com/Dev/status",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching step function status:", error);
    throw error; // Rethrow error to be handled by the caller
  }
};

// Function to delete a Kendra index
export const deleteKendraIndex = async () => {
  try {
    const response = await fetch(
      "https://cvpk976axb.execute-api.ap-south-1.amazonaws.com/Dev/delete ",
      // "https://b70s81u3u3.execute-api.ap-south-1.amazonaws.com/Dev/delete",
      {
        method: "POST",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting Kendra index:", error);
    throw error; // Rethrow error to be handled by the caller
  }
};
