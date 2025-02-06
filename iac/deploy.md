# Steps to Deploy eodhrc

1. **Determine the AWS account to deploy into.**

2. **Change appropriate environment variables.**

3. **Set up CLI for a new deployment:**

   ```sh
   aws configure sso
   aws sso login –profile eodhrc
   ```

   **Note:** You may need to deploy in `us-east-1` to take advantage of the `sparkgeo.dev` DNS.

4. **If in a new AWS account, you may need to bootstrap the deployment:**

   ```sh
   CDK bootstrap –profile eodhrc
   ```

5. **After checking the result of `cdk synth develop-eodhrc-static-site –profile eodhrc`, deploy the application:**

   ```sh
   CDK deploy develop-eodhrc-static-site –profile eodhrc
   ```

   CDK will stall until you add the Name Server (NS) record from Route 53 to the AWS account holding the DNS `sparkgeo.dev`. See Domain validation.

6. **Go to Route 53 and the newly created hosted zone:**

   - Copy the `ns-*` values.
   - Paste the NS values as an NS record in the AWS account that hosts `sparkgeo.dev`.
   - Wait for certificate validation to occur in CDK.

7. **Add GitHub Secrets:**
   - Secrets are found in the `.env` file + AWS credentials.
