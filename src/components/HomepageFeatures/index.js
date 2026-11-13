import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: '好学',
    Svg: require('@site/static/img/chinese_study.svg').default,
    description: (
      <>
        路漫漫其修远兮，吾将上下而求索。
      </>
    ),
  },
  {
    title: '专注',
    Svg: require('@site/static/img/chinese_bamboo.svg').default,
    description: (
      <>
        一心只读圣贤书。
      </>
    ),
  },
  {
    title: '耐心',
    Svg: require('@site/static/img/chinese_lotus.svg').default,
    description: (
      <>
        但行好事，莫问前程。
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="card" style={{height: '100%'}}>
        <div className="card__body text--center" style={{padding: '28px 20px'}}>
          <Svg
            className={styles.featureSvg}
            aria-hidden="true"
            focusable="false"
            width="120"
            height="120"
          />
          <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
          <p className={styles.featureDesc}>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className="sr-only">核心特点</Heading>
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
