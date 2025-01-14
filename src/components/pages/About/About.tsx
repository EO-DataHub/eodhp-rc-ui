import { Heading, Link } from '@radix-ui/themes'

import aboutStyles from './About.module.scss'
import deploySolutionsLogo from '../../../../public/deploysolutions-logo.jpeg'
import devSeedLogo from '../../../../public/devseed-logo.jpeg'
import heroPath from '../../../localAssets/aboutHero.jpg'
import oscLogo from '../../../../public/osc-logo.png'
import sparkgeoFullWordLogo from '../../../../public/sparkgeo-full-word-logo.png'
import { PageTitle } from '../../PageTitle'

export const About = () => {
  return (
    <div className={aboutStyles.pageWrapper}>
      <img src={heroPath} className={aboutStyles.hero} />
      <main className={aboutStyles.main}>
        <PageTitle>Climate Asset Risk Analysis Tool</PageTitle>
        <section>
          <Heading as="h2">Overview</Heading>
          <p>
            This Climate Asset Risk Analysis Tool (CLARAT) helps determine the
            future exposure and vulnerability of physical assets to various
            climate hazards, such as chronic heat, based on climate projections
            for different scenarios and years. These insights are complemented
            by historic earth observation data (e.g land surface temperature)
            which gives greater understanding into local variations, such as
            urban heat islands. Understanding these risks helps decision makers
            make better, more informed financial, economic and policy
            decisions..
          </p>
          <p>
            To make the calculations, the CLARAT application uses open and
            commercial data and models sourced from academia, government and
            industry collaborations. It makes use of functionality, data, and
            scientific models contained in the UK Pathfinder project Earth
            Observation Data Hub (EODH) on which CLARAT has been built.
          </p>
        </section>
        <section>
          <Heading as="h2">Purpose</Heading>
          <p>
            The EODH is a unique, world-leading UK-specific software
            infrastructure that operates at the forefront of digital Earth
            observation (EO) technologies. It provides easy and “single point”
            access to the best UK EO and Climate data and science for research,
            government and business use.
          </p>
          <p>
            The hub helps centralise and distribute open and commercial data
            from Climate Projections and Earth Observation. It reduces proven
            barriers to the effective exploitation of such data, such as
            fragmentation of data sources and services and the fact that source
            data may not be in a form that is readily exploitable. The platform
            also makes it easy for users of applications like CLARAT to publish,
            find, share, and use workflows, scientific models, and cloud
            computing resources and services.
          </p>
          <p>
            By using EODH-provided features and data, the CLARAT application
            shows how the EODH can be used to help address risks and challenges
            posed by climate change.
          </p>
        </section>

        <section>
          <Heading as="h2">How it Works</Heading>
          <p>
            The CLARAT application allows an end user to define a portfolio of
            physically-located property or infrastructure assets and run risk
            assessments against these, using open source methodology and models
            from The Linux Foundation®{' '}
            <Link
              href="https://os-climate.org/physical-risk-resilience/"
              target="_blank"
            >
              OS-Climate
            </Link>{' '}
            project (OS-C).
          </p>
          <p>
            These risk assessments can be made for a variety of climate change
            scenarios and years, and for a range of different hazards. A hazard
            is “the potential occurrence of a climate-related physical
            phenomenon” that can impact a financial asset under management. Each
            hazard has a range of hazard indicators. The methodology is fully
            described{' '}
            <Link
              href="https://github.com/os-climate/physrisk/blob/main/methodology/PhysicalRiskMethodology.pdf"
              target="_blank"
            >
              here
            </Link>
            .
          </p>
          <p>
            The OS-C Physical Risk & Resilience tools and models are available
            under the permissive free software licence, Apache 2.0. An overview
            and access to the code repositories is{' '}
            <Link
              href="https://github.com/os-climate/OS-Climate-Community-Hub/blob/main/PhysicalRiskRM.md#physical-risk--resilience"
              target="_blank"
            >
              here
            </Link>
            .
          </p>
          <p>
            The CLARAT App uses the EODH platform to derive hazard indicator
            datasets (e.g. chronic heat) from climate projections data which is
            also stored on EODH. When a CLARAT end user requests an asset
            portfolio risk assessment, the EODH automatically provides the
            necessary cloud computing infrastructure to run workflows, which
            determine exposure and vulnerability and report the results.
          </p>
          <p>
            The EODH also provides data which can help compare climate
            projections to actual observations. The CLARAT application currently
            uses Land Surface Temperature observations from the University of
            Leicester and Planet.
          </p>
        </section>
        <section>
          <Heading as="h2">Impact</Heading>
          <p>
            <strong>CLARAT can benefit users in many ways:</strong>
          </p>
          <ul className={aboutStyles.impactList}>
            <li>
              Asset Portfolio Managers can use this application to help assess
              their potential exposure to a variety of potential climate change
              pathways.
            </li>
            <li>
              Government and industry stakeholders can make improved assessment
              and forecasts of industry vulnerability to climate change, as well
              as adaptation and mitigation efforts.
            </li>
            <li>
              Central banks and other financial institutions can use the results
              to assist with regulatory compliance schemes, such as reports for
              climate change-related stress testing.
            </li>
            <li>
              Data scientists can use the outputs as a starting point to their
              own climate risk modelling.
            </li>
            <li>
              Users can be confident the resulting risk assessments are based on
              the latest most credible, authoritative insights and science.
            </li>
          </ul>
        </section>
        <section>
          <Heading as="h2">Team</Heading>
          <p>
            The EODH platform involves expert contributors from a wide variety
            of partners and stakeholders across government, research and
            commercial sectors, which you can{' '}
            <Link href="https://eodatahub.org.uk/about/" target="_blank">
              read more about.
            </Link>
          </p>

          <p>
            <strong>The CLARAT application team consists of:</strong>
          </p>
          <div className={aboutStyles.teamLogoWrapper}>
            <a href="https://sparkgeo.com/" target="_blank" rel="noreferrer">
              <img
                src={sparkgeoFullWordLogo}
                alt="Sparkgeo"
                className={aboutStyles.sparkgeoLogo}
              />
            </a>
            <a href="https://os-climate.org/" target="_blank" rel="noreferrer">
              <img src={oscLogo} alt="OS Climate" />
            </a>
            <div className={aboutStyles.devSeedDeploySolutionsLogoContainer}>
              <a
                href="https://developmentseed.org/"
                target="_blank"
                rel="noreferrer"
              >
                <img src={devSeedLogo} alt="Development Seed" />
              </a>
              <a
                href="https://www.deploy.solutions/"
                target="_blank"
                rel="noreferrer"
              >
                <img src={deploySolutionsLogo} alt="Development Seed" />
              </a>
            </div>

            <div>
              <p>
                <strong>Sparkgeo</strong>
              </p>
              <p>Project lead</p>
            </div>
            <div>
              <p>
                <strong>OS-Climate</strong>
              </p>
              <p>
                Collaboration partners and climate risk subject matter experts
              </p>
            </div>
            <div>
              <p>
                <strong>Development Seed and Deploy Solutions</strong>
              </p>
              <p>Implementation partners</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
