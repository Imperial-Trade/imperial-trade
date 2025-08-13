import { supabase } from "@/integrations/supabase/client";

export const testUserExistenceFunction = async (email: string) => {
  logger.log("=== TESTING EDGE FUNCTION DEPLOYMENT ===");
  logger.log("Testing with email:", email);

  try {
    // Test 1: Direct function invocation
    logger.log("Test 1: Direct function invocation...");
    const { data, error } = await supabase.functions.invoke(
      "check-user-existence",
      {
        body: { email },
      }
    );

    logger.log("Direct invocation result:", { data, error });

    if (error) {
      logger.error("Direct invocation failed:", error);

      // Test 2: Try with explicit headers
      logger.log("Test 2: Trying with explicit headers...");
      const { data: data2, error: error2 } = await supabase.functions.invoke(
        "check-user-existence",
        {
          body: { email },
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      logger.log("With headers result:", { data: data2, error: error2 });

      if (error2) {
        // Test 3: Try HTTP fetch directly
        logger.log("Test 3: Direct HTTP fetch...");
        try {
          const response = await fetch(
            `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/check-user-existence`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI`,
                apikey:
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.gvBGgPvvOYwMI9g8H5Cm9rKFB02G6z4tHIHEepKf7MI",
              },
              body: JSON.stringify({ email }),
            }
          );

          logger.log("HTTP response status:", response.status);
          logger.log(
            "HTTP response headers:",
            Object.fromEntries(response.headers)
          );

          const responseText = await response.text();
          logger.log("HTTP response text:", responseText);

          try {
            const responseData = JSON.parse(responseText);
            logger.log("HTTP response data:", responseData);
          } catch (e) {
            logger.log("Response is not valid JSON");
          }
        } catch (fetchError) {
          logger.error("HTTP fetch failed:", fetchError);
        }
      }
    }

    return { data, error };
  } catch (error) {
    logger.error("Test function error:", error);
    return { data: null, error };
  }
};
