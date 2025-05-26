import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
    const {siteConfig} = useDocusaurusContext();
    return (<header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
            <Heading as="h1" className="hero__title">
                {siteConfig.title}
            </Heading>
            <p className="hero__subtitle">
                {siteConfig.tagline}
            </p>
            <div className={styles.buttons}>
                <Link
                    style={{width: 100, paddingRight: 0, paddingLeft: 0}}
                    className="button button--secondary button--lg"
                    to="/docs/ide/ot"
                >
                    技术
                </Link>
                <Link
                    style={{
                        width: 100,
                        paddingRight: 0,
                        paddingLeft: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                    className="button button--secondary button--lg"
                    to="/blog"
                >
                    人生
                </Link>
            </div>
        </div>
    </header>);
}

export default function Home() {
    const {siteConfig} = useDocusaurusContext();
    if (typeof window !== 'undefined') {
        window.location.href = 'quickstart';
        return null;
    }
    return (<Layout
        title={`Hello from ${siteConfig.title}`}
        description="Description will go into a meta tag in <head />">
        <HomepageHeader/>
        <main>
            <HomepageFeatures/>
        </main>
    </Layout>);
}
