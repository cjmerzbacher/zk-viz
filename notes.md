# notes

## What comes after de novo? Automated lead optimization of proteins with CRADLE-1

**Link:** [biorxiv.org](https://www.biorxiv.org/content/10.64898/2026.03.06.710001v1.full.pdf)

### Abstract and Results

- Success metrics: number of iterations (4-7x fewer iterations) - 1-3 wet lab rounds

Protein language model embeddings → Fine-tuning on evolutionary neighborhoods (unsupervised) → Supervised fine-tuning on lab-in-the-loop data → Multi-model deployment

> Of additional interest, we find that (a) the end-to-end system may be run in automated fashion; (b) wet lab data may be consumed in 'black box' fashion **without knowledge of the underlying biochemical mechanisms**; (c) structural data may largely be superseded by sequence-function pairs.

- Multiobjective/simultaneous optimization of up to 8 different molecule properties
- "These computational aspects are automatable, and that this is true even in the presence of noisy wet lab data exhibiting batch effects. Practically speaking, this is an API call or UI interaction which consumes wet lab data and which returns designed proteins"

### Methods

1. **Pretraining**: existing protein language model trained on large DB ("foundation model")
2. **Unsupervised fine-tuning**: Foundation model trained ("evotuned") on evolutionary context of template sequence. Masked language loss optimized.
3. **Supervised fine-tuning**: If sequence-function pairs are available (lab data)
   1. **Preference optimization**: optimizing LLR using group direct preference optimization (g-DPO) — "logiter"
   2. **Regression head**: added to unsupervised model to predict properties given the sequence ("predictor")
      1. Automated batch effect robustness
      2. Multi-property Spearman rank correlation for model selection
4. **Generation**: Use beam search (on sequence graph) to generate candidates and **select** with logiter, then **rank** with predictor.
   1. Proceeds until enough candidates generated. "Double beam" search with two searches in parallel. **Temperature** for generation increases over time.

### Zero-shot prediction

If there is no data beyond initial templates, g-DPO is skipped and evotuned (unsupervised) model used directly as the logiter. Predictor is skipped and no diversity-aware tuning.

### Discussion

Quantitative estimate of "**optimization headroom**" tells the user when to stop. This is computed from the ratio of sequences predicted to outperform the template and the magnitude of those predicted gains.

---

## Teaching generative models to hallucinate

**Link:** [Teaching generative models to hallucinate](https://blog.escalante.bio/teaching-generative-models-to-hallucinate/)

Context: Escalante Bio focuses on protein binder design

- Similar to us: "you first generate a large collection of designs and then rank and filter them down to a handful for wetlab testing"
- Two main approaches:
  1. Optimization/hallucination (BindCraft) - higher quality but slower due to many sequential sequence updates (up to 150 per candidate)
  2. Generative models (BoltzGen) - faster due to one-shot prediction but lower *in silico* design quality

- Using pretraining process from LLMs, improve BoltzGen performance.
  1. large-scale pretraining on relatively unstructured and uncurated data to generate a base model
  2. smaller-scale finetuning on higher-quality (and possibly synthetic) data related to the downstream task
  3. reinforcement learning using model-based or verified rewards.
- Using hallucination (which is known to be higher quality) to generate synthetic data for finetuning and using a hallucination-based RL metric to further improve performance.
- To reduce computational cost, freeze "trunk" of BoltzGen and only fine-tune structure module at the end.
- Plotting "survival curves" based on metric to show distribution. Which fraction of designs have a certain score. Good way to **compare multiple scoring models**.
- Finetuned model produces different secondary structures than hallucinated (way more alpha helices vs. beta sheets) and shows accumulation of glutamates.
- Side note: translating to Jax leads to 3x speed improvements

---

## Why do research institutions look the same?

**Link:** [Why Do Research Institutes Look the Same?](https://www.asimov.press/p/research-forms)

- **Canalization**: many genotypes yield the same phenotype despite variations in causes (ex. different cause, same disease)
- Institutional forms are relatively limited: universities, startups, corporate research labs

Catalog of new types of research organizations: [The Overedge Catalog: The Future of Research Organizations](https://arbesman.net/overedge/)

**Path 1: academic institute**
- Problem: "shadow of the future" — even people who come to work at your cool research institution will likely need another job afterwards, leading to "regression to the institutional mean"

**Path 2: corporate research lab**
- Problem: requires investment, even with patient investors, which requires "startuppy activities"

> At some point a researchy startup needs to do a dramatic gear shift into growth and product-market fit mode. This transition often either prematurely kills the research potential or the company dies because it's being run by people with a research mindset

**Other possible paths**
- FRO model (Convergent Research)
- Bootstrapped ML Lab (Fast Forward Labs)
- "Hollywood movie model" — come together for project, then dissociate (Ink & Switch)
- NSF Tech Labs

> Or perhaps we need an institution that is really just a group of loosely affiliated independent researchers. That organization would have one person who fundraises for the researchers — The front man? The hype man? — and that's it.

### Further reading

- [Complexity scientist and VC Samuel Arbesman](https://arbesman.net/)
- [A Vision of Metascience](https://scienceplusplus.org/metascience/)
- [When should an idea that smells like research be a startup?](https://blog.spec.tech/p/when-should-an-idea-that-smells-like)
- [Ink & Switch](https://www.inkandswitch.com/)
- [The Case for Crazy Philanthropy](https://www.palladiummag.com/2025/08/22/the-case-for-crazy-philanthropy/)

---

## Machine learning-assisted discovery of growth decision elements in bacteria

**Link:** [Machine learning-assisted discovery of growth decision elements by relating bacterial population dynamics to environmental diversity](https://elifesciences.org/articles/76846#s1)

- Contains dataset with 12,828 bacterial growth curves with 966 medium combinations, composed of 44 pure chemical compounds
- Wild-type E. coli: BW25113
- Three parameters derived from the growth curve: lag time, growth rate, and saturated population size → Quantitative lag, stationary, and saturated phases
  - Trade-offs between growth rate and saturated population size
- ML model used: Gradient-boosted decision tree

- "Growth parameters were largely determined by a single component out of 41 components comprising the medium"
  - lag time → serine, growth rate → sulfate, population size → glucose

---

## Biology needs to become prospective

**Link:** [https://thestacks.org/publications/idea-prospective-biology](https://thestacks.org/publications/idea-prospective-biology)

Authors: Ryan York — [https://ryan-york.com](https://ryan-york.com/)

- Biological foundation models (BFMs) are limited by the **inherent non-independence** of biological data
  - Data volume is not proportionate with data information
  - Scaling laws in biology: [biorxiv.org](https://www.biorxiv.org/content/10.1101/2025.04.15.649055v2)

> We show that even a simple Bayesian framework can move us beyond the "bitter lesson" of brute-force scaling and instead treat biological measurement as a strategic act of inference. There's no excuse to gather data blindly; biology must become prospective.

- Imbalances in training data matter! They shape what BFMs can learn.
  - Latent correlations between training, validation, test data can lead to data leakage

> We typically train a massive model, celebrate its scale, and only then perform forensic audits to discover what it actually learned.
> Nonindependence ensures that the effective number of unique biological dimensions grows far more slowly than the number of measurements.

**Example: Augmenting AlphaFoldDB with proteomes**
1. Choose unit of analysis (individual proteins, FoldSeek clusters, environmental samples, whole proteomes)
   - Chose proteome, represented as a distribution over FoldSeek clusters
2. Find clusters which induce a large shift in the posterior, measured by **information gain** (KL divergence between prior and posterior)
   - Variance much higher for eukaryotes than prokaryotes → depth-first sampling better for eukaryotes, breadth-first for prokaryotes

> Viewed through this lens, we see an inversion of the "bitter lesson": efficient compute doesn't require data to be simply abundant or diverse, but of *high utility*.

- Seen with GEM dimensionality size!

---

## The Adolescence of Technology

**Link:** [Dario Amodei — The Adolescence of Technology](https://www.darioamodei.com/essay/the-adolescence-of-technology)

- Avoid thinking about AI risks in a quasi-religious way
- AI opportunity vs. AI risk

> I firmly believe that government actions will also be required to some extent, but these interventions are different in character because they can potentially destroy economic value or coerce unwilling actors. It's thus very important for regulations to be judicious.

- I wonder if this has changed since the DoD conflict; do we have a government capable of regulation right now?
- Lack of specificity about what would rise to the level of action? What evidence would support "shutting it down"?

> Even if powerful AI is only 1–2 years away in a technical sense, many of its societal consequences may take a few years longer to occur. This is why I can simultaneously think that AI will disrupt 50% of entry-level white-collar jobs over 1–5 years, while also thinking we may have AI that is more capable than everyone in only 1–2 years.

"Country of geniuses in a data center"

### Autonomy risks

Software design, cyber operations, R&D for physical technologies, statecraft

- Position 1: Nowhere for autonomous impulses to come from (Yann LeCun)?
- Evidence that AI systems are unpredictable and difficult to control
  - Sycophancy, laziness, deception, cheating, obsessions.
- Position 2: Good strategy is to seek power across diverse environments
  - Problem: "vague conceptual argument about high-level incentives"
  - More subtle version: AI models can develop weird psychological states that are paranoid, violent, unstable, or epistemically psychotic

- Risk: all AI systems trained from a few base models which are then misaligned. Having good AIs as defense is not necessarily effective.
- Models can intentionally game evaluation tests before release.

### Defenses

- Develop science of reliably training and steering AI models, forming personalities in a predictable way
  - Constitutional AI based on a central values document
- Mechanistic interpretability as a way of evaluating models for negative tendencies
- Open communication across industry
- Transparency legislation (SB53 California or RAISE act in New York)

### Misuse for destruction or seizing power

### Economic disruption (mass unemployment or concentration of wealth)

### Indirect destabilizing effects
