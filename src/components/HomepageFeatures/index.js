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
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
