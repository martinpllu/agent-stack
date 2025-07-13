/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "agent-stack-reference-app",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // Create VPC for the database
    const vpc = new sst.aws.Vpc("AppVpc", {
      nat: "managed",
    });

    // Determine database configuration based on stage
    const isProduction = $app.stage === "production";
    
    // Define which stages are allowed to create the shared dev cluster
    // You can add more stages here if needed
    const devClusterCreatorStages = ["dev", "staging"];
    const canCreateDevCluster = devClusterCreatorStages.includes($app.stage);
    
    let database: sst.aws.Aurora;
    
    if (isProduction) {
      // Production gets its own dedicated cluster
      database = new sst.aws.Aurora("Database", {
        engine: "postgres",
        version: "16.4",
        vpc,
        scaling: {
          min: "0 ACU",
          max: "16 ACU",
          pauseAfter: "60 minutes",
        },
        database: "production",
        dataApi: true,
      });
    } else if (canCreateDevCluster) {
      // Designated stages that can create the shared dev cluster
      database = new sst.aws.Aurora("SharedDevDatabase", {
        engine: "postgres",
        version: "16.4",
        vpc,
        scaling: {
          min: "0 ACU",
          max: "4 ACU",
          pauseAfter: "10 minutes",
        },
        // The cluster itself will have a default database
        database: "postgres",
        dataApi: true,
        transform: {
          cluster: {
            // Use a fixed identifier for the shared cluster
            clusterIdentifier: `${$app.name}-shared-dev-cluster`,
          },
        },
      });
    } else {
      // All other stages reference the shared dev cluster
      // They assume it was created by one of the creator stages
      database = sst.aws.Aurora.get(
        "SharedDevDatabase", 
        `${$app.name}-shared-dev-cluster`
      );
    }
    
    // Each stage uses its own database name within the cluster
    const stageDatabaseName = $app.stage.replace(/-/g, "_");
    
    // Build the DATABASE_URL from Aurora outputs
    
    // Create DynamoDB table for OpenAuth storage
    const authTable = new sst.aws.Dynamo("AuthStorage", {
      fields: {
        pk: "string",
        sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
    });
    
    const auth = new sst.aws.Function("AuthFunction", {
      handler: "auth/index.handler",
      environment: {
        OPENAUTH_STORAGE_TABLE: authTable.name,
        // Aurora Data API configuration (standardized approach)
        DB_DATABASE: stageDatabaseName,
        DB_CLUSTER_ARN: database.clusterArn,
        DB_SECRET_ARN: database.secretArn,
        // Official SST dev mode detection
        SST_DEV: $dev ? "true" : "false",
      },
      link: [authTable, database],
      url: true,
    });
    
    new sst.aws.React("web", {
      vpc,
      environment: {
        // Aurora Data API configuration (standardized approach)
        DB_DATABASE: stageDatabaseName,
        DB_CLUSTER_ARN: database.clusterArn,
        DB_SECRET_ARN: database.secretArn,
        // Auth backend URL for custom login flow
        AUTH_BACKEND_URL: auth.url,
      },
      link: [auth, authTable, database],
    });

    return {
      database: {
        host: database.host,
        port: database.port,
        database: stageDatabaseName,
        clusterArn: database.clusterArn,
        secretArn: database.secretArn,
      },
      auth: {
        table: authTable.name,
        url: auth.url,
      },
    };
  },
});
